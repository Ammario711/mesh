import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { createId } from "../../../lib/mesh/auth";
import { notifySupport } from "../../../lib/mesh/notifications";
import { recordAuditEvent } from "../../../lib/mesh/observability";
import { getMarketplaceStore } from "../../../lib/mesh/store";
import { parseJobSubmission, parseJsonBody } from "../../../lib/mesh/validation";
import { enforceRateLimit, statusForError } from "../../../lib/mesh/security";

export const runtime = "nodejs";

export async function GET() {
  const store = getMarketplaceStore();
  const jobs = await store.listJobs();

  return NextResponse.json({ jobs, storage: store.adapter });
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "job-create", {
      limit: 30,
      windowMs: 1000 * 60 * 60,
    });

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
    await store.createJobEvent({
      createdAt: new Date().toISOString(),
      id: createId("job_event"),
      jobId: savedJob.id,
      note: `RFQ sent to ${savedJob.makerName}.`,
      status: savedJob.status,
    });
    await recordAuditEvent({
      metadata: {
        fileName: savedJob.fileName,
        makerName: savedJob.makerName,
        price: savedJob.price,
        projectName: savedJob.projectName,
      },
      targetId: savedJob.id,
      type: "job.created",
    });
    await notifySupport(
      `New Mesh job: ${savedJob.projectName}`,
      `${savedJob.projectName} was sent to ${savedJob.makerName} for CAD file ${savedJob.fileName}. Estimated total: ${savedJob.price.toFixed(2)}.`,
    );

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
        status: statusForError(error),
      },
    );
  }
}
