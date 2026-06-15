import { NextResponse } from "next/server";
import { verifyAuthChallenge } from "../../../../lib/mesh/auth";
import { recordAuditEvent } from "../../../../lib/mesh/observability";
import { setSessionCookie } from "../../../../lib/mesh/server-auth";
import { enforceRateLimit, statusForError } from "../../../../lib/mesh/security";
import { parseJsonBody } from "../../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "auth-verify", {
      limit: 10,
      windowMs: 1000 * 60 * 15,
    });
    const body = parseJsonBody(await request.json());
    const user = await verifyAuthChallenge({
      challengeId: String(body.challengeId ?? ""),
      code: String(body.code ?? ""),
      name: String(body.name ?? ""),
      organization: String(body.organization ?? ""),
    });

    await setSessionCookie(user);
    await recordAuditEvent({
      actorEmail: user.email,
      metadata: { role: user.role },
      targetId: user.id,
      type: "auth.login",
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not verify login.",
      },
      { status: statusForError(error) },
    );
  }
}
