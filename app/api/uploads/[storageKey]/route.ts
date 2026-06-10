import { NextResponse } from "next/server";
import { readCadUpload } from "../../../../lib/mesh/upload-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storageKey: string }> },
) {
  try {
    const { storageKey } = await params;
    const upload = await readCadUpload(decodeURIComponent(storageKey));

    return new Response(new Uint8Array(upload.buffer), {
      headers: {
        "content-type": upload.contentType,
        "content-disposition": `attachment; filename="${safeDownloadName(storageKey)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "CAD upload not found." }, { status: 404 });
  }
}

function safeDownloadName(value: string) {
  return pathSafe(value).slice(0, 160) || "mesh-cad-file";
}

function pathSafe(value: string) {
  return decodeURIComponent(value).replace(/[^a-zA-Z0-9._-]/g, "-");
}
