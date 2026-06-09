import { NextResponse } from "next/server";
import { makers } from "../../../lib/mesh/domain";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ makers });
}
