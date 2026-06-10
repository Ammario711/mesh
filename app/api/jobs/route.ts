import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { getMarketplaceStore } from "../../../lib/mesh/store";
import { parseJobSubmission, parseJsonBody } from "../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function GET() {
  const store = getMarketplaceStore();
  const jobs = await store.listJobs();

  return NextResponse.json({ jobs, storage: store.adapter });
}

export async function POST(request: Request) {
  try {
    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const body = parseJsonBody(await request.json());
    const job = parseJobSubmission(body.job ?? body);
    const store = getMarketplaceStore();
    const savedJob = await store.createJob({
      ...job,
      sentAt: job.sentAt || new Date().toISOString(),
      status: job.status || "Quote Sent",
    });

    return NextResponse.json(
      { job: savedJob, storage: store.adapter },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mesh could not save that job.",
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
