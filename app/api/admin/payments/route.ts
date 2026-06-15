import { NextResponse } from "next/server";
import { getCurrentSession, requireRole } from "../../../../lib/mesh/server-auth";
import { statusForError } from "../../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../../lib/mesh/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    requireRole(await getCurrentSession(), ["admin"]);

    const store = getMarketplaceStore();
    const payments = await store.listPayments();

    return NextResponse.json({ payments, storage: store.adapter });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load payments.",
      },
      { status: statusForError(error, 401) },
    );
  }
}
