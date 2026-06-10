import { NextResponse } from "next/server";
import { makers } from "../../../lib/mesh/domain";
import { getPublicAppConfig } from "../../../lib/mesh/config";

export const runtime = "nodejs";

export async function GET() {
  const config = getPublicAppConfig();

  return NextResponse.json({
    ok: true,
    ready: config.ready,
    service: "mesh-api",
    storage: config.storage,
    makerCount: makers.length,
    readiness: config.readiness,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
