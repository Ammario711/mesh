import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../../lib/mesh/config";
import {
  createPaymentRecord,
  createStripeCheckoutSession,
} from "../../../../lib/mesh/payments";
import { recordAuditEvent } from "../../../../lib/mesh/observability";
import { getCurrentSession, requireRole } from "../../../../lib/mesh/server-auth";
import { statusForError } from "../../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../../lib/mesh/store";
import { parseJsonBody } from "../../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = requireRole(await getCurrentSession(), [
      "buyer",
      "admin",
    ]);

    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const body = parseJsonBody(await request.json());
    const jobId = String(body.jobId ?? "");
    const store = getMarketplaceStore();
    const job = (await store.listJobs()).find((item) => item.id === jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const checkoutSession = await createStripeCheckoutSession(job);
    const payment = await store.upsertPayment(
      createPaymentRecord(job, checkoutSession),
    );

    await recordAuditEvent({
      actorEmail: session.email,
      metadata: { jobId, provider: "stripe" },
      targetId: payment.id,
      type: "payment.checkout_created",
    });

    return NextResponse.json({ payment, url: checkoutSession.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create checkout.",
      },
      { status: statusForError(error, 503) },
    );
  }
}
