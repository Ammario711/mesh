import { NextResponse } from "next/server";
import { makers } from "../../../lib/mesh/domain";
import { getStorageMode } from "../../../lib/mesh/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "mesh-api",
    storage: getStorageMode(),
    makerCount: makers.length,
    timestamp: new Date().toISOString(),
  });
}
