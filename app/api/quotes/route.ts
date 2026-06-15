import { NextResponse } from "next/server";
import { calculateQuote, matchMakers } from "../../../lib/mesh/domain";
import {
  parseJsonBody,
  parseParsedCadFile,
  parseQuoteSpec,
} from "../../../lib/mesh/validation";
import { enforceRateLimit, statusForError } from "../../../lib/mesh/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "quote-calculate", {
      limit: 80,
      windowMs: 1000 * 60 * 60,
    });

    const body = parseJsonBody(await request.json());
    const file = parseParsedCadFile(body.file);
    const spec = parseQuoteSpec(body.spec);
    const quote = calculateQuote(file, spec);
    const matches = matchMakers({
      material: spec.material,
      quantity: spec.quantity,
      toleranceTarget: spec.toleranceTarget,
      urgency: spec.urgency,
    });

    return NextResponse.json({ quote, matches, spec });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mesh could not calculate that quote.",
      },
      { status: statusForError(error) },
    );
  }
}
