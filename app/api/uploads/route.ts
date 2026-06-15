import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { recordAuditEvent } from "../../../lib/mesh/observability";
import { getMarketplaceStore } from "../../../lib/mesh/store";
import { saveCadUpload } from "../../../lib/mesh/upload-storage";
import { parseParsedCadFile } from "../../../lib/mesh/validation";
import { enforceRateLimit, statusForError } from "../../../lib/mesh/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "cad-upload", {
      limit: 20,
      windowMs: 1000 * 60 * 60,
    });

    if (shouldRejectEphemeralWrites()) {
      throw ephemeralWriteError();
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file");
    const metadata = formData.get("metadata");

    if (!(uploadedFile instanceof File)) {
      throw new Error("A CAD file is required.");
    }

    if (typeof metadata !== "string") {
      throw new Error("CAD metadata is required.");
    }

    const parsedFile = parseParsedCadFile(JSON.parse(metadata));
    const storedUpload = await saveCadUpload(uploadedFile, parsedFile.id);
    const file = {
      ...parsedFile,
      downloadUrl: storedUpload.downloadUrl,
      sizeBytes: storedUpload.sizeBytes,
      storageKey: storedUpload.storageKey,
    };
    const store = getMarketplaceStore();
    const savedFile = await store.upsertFile(file);
    await recordAuditEvent({
      metadata: {
        fileName: savedFile.name,
        sizeBytes: savedFile.sizeBytes,
        type: savedFile.type,
      },
      targetId: savedFile.id,
      type: "file.uploaded",
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
            : "Mesh could not upload that CAD file.",
      },
      {
        status: statusForError(error),
      },
    );
  }
}
