import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../../lib/mesh/config";
import { createAuthChallenge, normalizeEmail } from "../../../../lib/mesh/auth";
import type { UserRole } from "../../../../lib/mesh/domain";
import { sendEmail } from "../../../../lib/mesh/notifications";
import { recordAuditEvent } from "../../../../lib/mesh/observability";
import { enforceRateLimit, statusForError } from "../../../../lib/mesh/security";
import { parseJsonBody } from "../../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "auth-start", {
      limit: 5,
      windowMs: 1000 * 60 * 15,
    });

    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const body = parseJsonBody(await request.json());
    const email = normalizeEmail(String(body.email ?? ""));
    const requestedRole = parseRole(body.role);

    if (!email.includes("@")) {
      throw new Error("A valid email is required.");
    }

    const { challenge, code } = await createAuthChallenge({
      email,
      role: requestedRole,
    });

    await sendEmail({
      subject: "Your Mesh login code",
      text: `Your Mesh login code is ${code}. It expires in 10 minutes.`,
      to: email,
    });
    await recordAuditEvent({
      actorEmail: email,
      metadata: { role: requestedRole },
      targetId: challenge.id,
      type: "auth.challenge_created",
    });

    return NextResponse.json({
      challengeId: challenge.id,
      devCode: process.env.NODE_ENV === "production" ? undefined : code,
      sent: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not start login.",
      },
      { status: statusForError(error) },
    );
  }
}

function parseRole(value: unknown): UserRole {
  return value === "maker" || value === "admin" ? value : "buyer";
}
