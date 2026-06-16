import { NextResponse } from "next/server";
import { calculateQuote } from "../../../lib/mesh/domain";
import {
  analyzeManufacturability,
  buildMakerBidStack,
} from "../../../lib/mesh/intelligence";
import { enforceRateLimit, statusForError } from "../../../lib/mesh/security";
import {
  parseJsonBody,
  parseParsedCadFile,
  parseQuoteSpec,
} from "../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "dfm-analysis", {
      limit: 80,
      windowMs: 1000 * 60 * 60,
    });

    const body = parseJsonBody(await request.json());
    const file = parseParsedCadFile(body.file);
    const spec = parseQuoteSpec(body.spec);
    const quote = calculateQuote(file, spec);
    const dfm = analyzeManufacturability(file, spec, quote);
    const bids = buildMakerBidStack(file, spec);

    return NextResponse.json({ bids, dfm, quote, spec });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mesh could not analyze that CAD file.",
      },
      { status: statusForError(error) },
    );
  }
}
