import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/mesh/server-auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  return NextResponse.json({ session });
}
