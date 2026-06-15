import { NextResponse } from "next/server";
import { getCurrentSession, requireRole } from "../../../../lib/mesh/server-auth";
import { statusForError } from "../../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../../lib/mesh/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    requireRole(await getCurrentSession(), ["admin"]);

    const store = getMarketplaceStore();
    const events = await store.listAuditEvents();

    return NextResponse.json({ events, storage: store.adapter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load audit." },
      { status: statusForError(error, 401) },
    );
  }
}
