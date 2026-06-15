import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { getMarketplaceStore } from "../../../lib/mesh/store";
import { notifySupport } from "../../../lib/mesh/notifications";
import { recordAuditEvent } from "../../../lib/mesh/observability";
import {
  parseJsonBody,
  parseMakerApplication,
} from "../../../lib/mesh/validation";
import {
  enforceRateLimit,
  rejectBotSubmission,
  statusForError,
} from "../../../lib/mesh/security";

export const runtime = "nodejs";

export async function GET() {
  const store = getMarketplaceStore();
  const applications = await store.listMakerApplications();

  return NextResponse.json({ applications, storage: store.adapter });
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "maker-application", {
      limit: 8,
      windowMs: 1000 * 60 * 60,
    });

    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const body = parseJsonBody(await request.json());
    rejectBotSubmission(body);
    const application = parseMakerApplication(body.application ?? body);
    const store = getMarketplaceStore();
    const savedApplication = await store.createMakerApplication(application);

    await recordAuditEvent({
      actorEmail: application.email,
      metadata: { shopName: application.shopName },
      targetId: application.id,
      type: "maker_application.submitted",
    });
    await notifySupport(
      `New Mesh maker application: ${application.shopName}`,
      `${application.shopName} applied from ${application.city || "unknown city"} with ${application.processes.join(", ") || "no processes listed"}.`,
    );

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
        status: statusForError(error),
      },
    );
  }
}
