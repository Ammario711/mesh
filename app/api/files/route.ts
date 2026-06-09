import { NextResponse } from "next/server";
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
    const body = parseJsonBody(await request.json());
    const file = parseParsedCadFile(body.file ?? body);
    const store = getMarketplaceStore();
    const savedFile = await store.upsertFile(file);

    return NextResponse.json(
      { file: savedFile, storage: store.adapter },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Mesh could not save that CAD file.",
    },
    { status: 400 },
  );
}
