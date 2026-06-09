import { NextResponse } from "next/server";
import { calculateQuote, matchMakers } from "../../../lib/mesh/domain";
import {
  parseJsonBody,
  parseParsedCadFile,
  parseQuoteSpec,
} from "../../../lib/mesh/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
      { status: 400 },
    );
  }
}
