import { NextResponse } from "next/server";
import { createId } from "../../../../../../lib/mesh/auth";
import type { JobStatus } from "../../../../../../lib/mesh/domain";
import { notifySupport } from "../../../../../../lib/mesh/notifications";
import { recordAuditEvent } from "../../../../../../lib/mesh/observability";
import {
  getCurrentSession,
  requireRole,
} from "../../../../../../lib/mesh/server-auth";
import { statusForError } from "../../../../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../../../../lib/mesh/store";
import { parseJsonBody } from "../../../../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireRole(await getCurrentSession(), ["admin", "maker"]);
    const { id } = await params;
    const body = parseJsonBody(await request.json());
    const status = parseJobStatus(body.status);
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const store = getMarketplaceStore();
    const job = (await store.listJobs()).find((item) => item.id === id);

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const updatedJob = await store.updateJob({ ...job, status });
    const event = await store.createJobEvent({
      actorEmail: session.email,
      createdAt: new Date().toISOString(),
      id: createId("job_event"),
      jobId: id,
      note,
      status,
    });

    await recordAuditEvent({
      actorEmail: session.email,
      metadata: { status },
      targetId: id,
      type: "job.status_updated",
    });
    await notifySupport(
      `Mesh job status updated: ${job.projectName}`,
      `${session.email} moved ${job.projectName} to ${status}. ${note}`,
    );

    return NextResponse.json({ event, job: updatedJob });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update job." },
      { status: statusForError(error, 401) },
    );
  }
}

function parseJobStatus(value: unknown): JobStatus {
  if (
    value === "Quote Sent" ||
    value === "Accepted" ||
    value === "In Production" ||
    value === "Ready"
  ) {
    return value;
  }

  throw new Error("Invalid job status.");
}
