import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { getMarketplaceStore } from "../../../lib/mesh/store";
import {
  parseJsonBody,
  parseMakerApplication,
} from "../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function GET() {
  const store = getMarketplaceStore();
  const applications = await store.listMakerApplications();

  return NextResponse.json({ applications, storage: store.adapter });
}

export async function POST(request: Request) {
  try {
    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const body = parseJsonBody(await request.json());
    const application = parseMakerApplication(body.application ?? body);
    const store = getMarketplaceStore();
    const savedApplication = await store.createMakerApplication(application);

    return NextResponse.json(
      { application: savedApplication, storage: store.adapter },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mesh could not save that maker application.",
      },
      {
        status:
          error instanceof Error &&
          error.message.includes("Production storage")
            ? 503
            : 400,
      },
    );
  }
}
