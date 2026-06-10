import { NextResponse } from "next/server";
import { getPublicAppConfig } from "../../../lib/mesh/config";

export const runtime = "nodejs";

export async function GET() {
  const config = getPublicAppConfig();

  return NextResponse.json(
    {
      ready: config.ready,
      readiness: config.readiness,
      storage: config.storage,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
      status: config.ready ? 200 : 503,
    },
  );
}
