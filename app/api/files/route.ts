import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { recordAuditEvent } from "../../../lib/mesh/observability";
import { enforceRateLimit, statusForError } from "../../../lib/mesh/security";
import { getMarketplaceStore } from "../../../lib/mesh/store";
import { parseJsonBody, parseParsedCadFile } from "../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function GET() {
  const store = getMarketplaceStore();
  const files = await store.listFiles();

  return NextResponse.json({ files, storage: store.adapter });
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "file-metadata", {
      limit: 40,
      windowMs: 1000 * 60 * 60,
    });

    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const body = parseJsonBody(await request.json());
    const file = parseParsedCadFile(body.file ?? body);
    const store = getMarketplaceStore();
    const savedFile = await store.upsertFile(file);
    await recordAuditEvent({
      metadata: {
        fileName: savedFile.name,
        sizeBytes: savedFile.sizeBytes,
        type: savedFile.type,
      },
      targetId: savedFile.id,
      type: "file.metadata_saved",
    });

    return NextResponse.json(
      { file: savedFile, storage: store.adapter },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mesh could not save that CAD file.",
      },
      {
        status: statusForError(error),
      },
    );
  }
}
