import { NextResponse } from "next/server";
import { recordAuditEvent } from "../../../../lib/mesh/observability";
import {
  clearSessionCookie,
  getCurrentSession,
} from "../../../../lib/mesh/server-auth";

export const runtime = "nodejs";

export async function POST() {
  const session = await getCurrentSession();

  await clearSessionCookie();

  if (session) {
    await recordAuditEvent({
      actorEmail: session.email,
      metadata: { role: session.role },
      targetId: session.id,
      type: "auth.logout",
    });
  }

  return NextResponse.json({ ok: true });
}
