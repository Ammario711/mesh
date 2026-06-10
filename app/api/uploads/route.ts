import { NextResponse } from "next/server";
import {
  ephemeralWriteError,
  shouldRejectEphemeralWrites,
} from "../../../lib/mesh/config";
import { getMarketplaceStore } from "../../../lib/mesh/store";
import { saveCadUpload } from "../../../lib/mesh/upload-storage";
import { parseParsedCadFile } from "../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
        status:
          error instanceof Error &&
          error.message.includes("Production storage")
            ? 503
            : 400,
      },
    );
  }
}
