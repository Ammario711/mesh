import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { notifySupport } from "../../../lib/mesh/notifications";
import { recordAuditEvent } from "../../../lib/mesh/observability";
import {
  enforceRateLimit,
  rejectBotSubmission,
  statusForError,
} from "../../../lib/mesh/security";
import { parseJsonBody } from "../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "support", {
      limit: 6,
      windowMs: 1000 * 60 * 60,
    });

    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const body = parseJsonBody(await request.json());
    rejectBotSubmission(body);

    const email = readString(body.email);
    const message = readString(body.message);
    const name = readString(body.name) || "Mesh user";
    const subject = readString(body.subject) || "Mesh support request";

    if (!email || !message) {
      throw new Error("Email and message are required.");
    }

    await notifySupport(
      `Mesh support: ${subject}`,
      `${name} <${email}> sent a support request:\n\n${message}`,
    );
    await recordAuditEvent({
      actorEmail: email,
      metadata: { subject },
      type: "support.requested",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mesh could not send that support request.",
      },
      { status: statusForError(error) },
    );
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 4000) : "";
}
