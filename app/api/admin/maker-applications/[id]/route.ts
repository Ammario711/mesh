import { NextResponse } from "next/server";
import { sendEmail } from "../../../../../lib/mesh/notifications";
import { recordAuditEvent } from "../../../../../lib/mesh/observability";
import { getCurrentSession, requireRole } from "../../../../../lib/mesh/server-auth";
import { statusForError } from "../../../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../../../lib/mesh/store";
import { parseJsonBody } from "../../../../../lib/mesh/validation";
import type { MakerApplicationStatus } from "../../../../../lib/mesh/domain";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireRole(await getCurrentSession(), ["admin"]);
    const { id } = await params;
    const body = parseJsonBody(await request.json());
    const status = parseStatus(body.status);
    const store = getMarketplaceStore();
    const applications = await store.listMakerApplications();
    const application = applications.find((item) => item.id === id);

    if (!application) {
      return NextResponse.json(
        { error: "Maker application not found." },
        { status: 404 },
      );
    }

    const updatedApplication = await store.updateMakerApplication({
      ...application,
      reviewedAt: new Date().toISOString(),
      reviewedBy: session.email,
      status,
    });

    await recordAuditEvent({
      actorEmail: session.email,
      metadata: { status },
      targetId: id,
      type: "maker_application.reviewed",
    });

    await sendEmail({
      subject: `Mesh maker application ${status.toLowerCase()}`,
      text: `Your Mesh maker application for ${application.shopName} is now ${status}.`,
      to: application.email,
    });

    return NextResponse.json({ application: updatedApplication });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update maker." },
      { status: statusForError(error, 401) },
    );
  }
}

function parseStatus(value: unknown): MakerApplicationStatus {
  if (
    value === "Submitted" ||
    value === "Reviewing" ||
    value === "Approved" ||
    value === "Declined"
  ) {
    return value;
  }

  throw new Error("Invalid maker application status.");
}
