import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../../lib/mesh/config";
import { recordAuditEvent } from "../../../../lib/mesh/observability";
import { statusForError } from "../../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../../lib/mesh/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const rawBody = await request.text();
    verifyStripeSignature(rawBody, request.headers.get("stripe-signature"));
    const event = JSON.parse(rawBody) as {
      data?: { object?: { id?: string; metadata?: { jobId?: string } } };
      type?: string;
    };

    if (event.type === "checkout.session.completed") {
      const sessionId = event.data?.object?.id;
      const store = getMarketplaceStore();
      const payment = (await store.listPayments()).find(
        (item) => item.providerSessionId === sessionId,
      );

      if (payment) {
        await store.upsertPayment({ ...payment, status: "Paid" });
      }

      await recordAuditEvent({
        metadata: {
          jobId: event.data?.object?.metadata?.jobId ?? null,
          providerSessionId: sessionId ?? null,
        },
        targetId: payment?.id,
        type: "payment.paid",
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook verification failed.",
      },
      { status: statusForError(error) },
    );
  }
}

function verifyStripeSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required.");
  }

  const timestamp = signatureHeader
    ?.split(",")
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signature = signatureHeader
    ?.split(",")
    .find((part) => part.startsWith("v1="))
    ?.slice(3);

  if (!timestamp || !signature) {
    throw new Error("Missing Stripe signature.");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid Stripe signature.");
  }
}
