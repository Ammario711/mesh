import {
  calculateQuote,
  makers,
  scoreMaker,
  type Maker,
  type ParsedCadFile,
  type QuoteResult,
  type QuoteSpec,
} from "./domain";

export type DfmSeverity = "low" | "medium" | "high";

export type DfmFinding = {
  detail: string;
  severity: DfmSeverity;
  title: string;
};

export type DfmReport = {
  confidence: number;
  estimatedReviewMinutes: number;
  findings: DfmFinding[];
  manufacturabilityScore: number;
  readiness: "Production ready" | "Maker review" | "Needs redesign";
  summary: string;
};

export type MakerBid = {
  maker: Maker;
  confidence: number;
  estimatedPrice: number;
  fit: "Best fit" | "Good fit" | "Manual review";
  leadTime: string;
  margin: number;
  reasons: string[];
  score: number;
};

export function analyzeManufacturability(
  file: ParsedCadFile,
  spec: QuoteSpec,
  quote: QuoteResult,
): DfmReport {
  const findings: DfmFinding[] = [];
  const envelope = parseEnvelope(file.dimensions);
  const largestAxis = Math.max(envelope.x, envelope.y, envelope.z);
  const smallestAxis = Math.min(envelope.x, envelope.y, envelope.z);
  const aspectRatio = smallestAxis > 0 ? largestAxis / smallestAxis : 1;

  if (file.source === "STEP estimate") {
    findings.push({
      detail:
        "STEP support is enabled, but this quote uses a topology estimate until a CAD kernel performs exact feature extraction.",
      severity: "medium",
      title: "Exact geometry pending",
    });
  }

  if (file.volume < 0.35) {
    findings.push({
      detail:
        "Very small parts often need manual orientation, nozzle, and minimum-wall review before production.",
      severity: "medium",
      title: "Small-feature risk",
    });
  }

  if (largestAxis > 240) {
    findings.push({
      detail:
        "The part may exceed common desktop FDM build volumes and could require splitting, CNC, or a larger-format operator.",
      severity: "high",
      title: "Build-volume risk",
    });
  }

  if (aspectRatio > 8) {
    findings.push({
      detail:
        "Long, thin geometry can warp or vibrate during machining. Add fixturing notes or consider material/process review.",
      severity: "medium",
      title: "Warping and fixturing risk",
    });
  }

  if (spec.toleranceTarget === "Tight") {
    findings.push({
      detail:
        "Tight tolerances should be maker-confirmed with inspection method, print orientation, and post-processing expectations.",
      severity: "medium",
      title: "Tolerance confirmation",
    });
  }

  if (spec.urgency === "Rush" && spec.quantity >= 10) {
    findings.push({
      detail:
        "Rush batch work depends on queue availability and may split across operators to maintain lead time.",
      severity: "medium",
      title: "Rush capacity risk",
    });
  }

  if (quote.price < 12) {
    findings.push({
      detail:
        "The estimate is near minimum-order economics. Expect maker minimums or bundled pickup/delivery fees.",
      severity: "low",
      title: "Minimum-order economics",
    });
  }

  const scorePenalty = findings.reduce((total, finding) => {
    if (finding.severity === "high") {
      return total + 24;
    }

    if (finding.severity === "medium") {
      return total + 12;
    }

    return total + 5;
  }, 0);
  const manufacturabilityScore = clampScore(96 - scorePenalty);
  const confidence = clampScore(
    manufacturabilityScore - (file.source === "STEP estimate" ? 8 : 0),
  );
  const readiness =
    manufacturabilityScore >= 82
      ? "Production ready"
      : manufacturabilityScore >= 58
        ? "Maker review"
        : "Needs redesign";

  return {
    confidence,
    estimatedReviewMinutes: Math.max(
      6,
      Math.round(
        18 + findings.length * 7 + (spec.toleranceTarget === "Tight" ? 8 : 0),
      ),
    ),
    findings: findings.length
      ? findings
      : [
          {
            detail:
              "No obvious geometry, capacity, or quote-risk flags were detected from the parsed file metadata.",
            severity: "low",
            title: "Clean first-pass check",
          },
        ],
    manufacturabilityScore,
    readiness,
    summary:
      readiness === "Production ready"
        ? "This part looks ready for local production with standard maker confirmation."
        : readiness === "Maker review"
          ? "This part is quotable, but a maker should confirm the flagged production assumptions."
          : "This part needs design or process review before it should enter production.",
  };
}

export function buildMakerBidStack(
  file: ParsedCadFile,
  spec: QuoteSpec,
): MakerBid[] {
  const baseQuote = calculateQuote(file, spec);

  return makers
    .map((maker) => {
      const match = scoreMaker(maker, spec);
      const distancePremium = maker.distanceMiles > 6 ? 0.05 : 0;
      const capacityPremium =
        spec.quantity > 10 && maker.capacity.includes("Batch") ? -0.04 : 0;
      const rushPremium = spec.urgency === "Rush" && maker.leadDays > 1 ? 0.08 : 0;
      const tolerancePremium =
        spec.toleranceTarget === "Tight" && maker.tags.includes("Tight tolerance")
          ? 0.04
          : spec.toleranceTarget === "Tight"
            ? 0.12
            : 0;
      const margin = distancePremium + capacityPremium + rushPremium + tolerancePremium;
      const estimatedPrice = baseQuote.price * (1 + margin);
      const confidence = clampScore(
        match.score -
          (match.compatible ? 0 : 18) -
          Math.max(0, maker.leadDays - 1) * 3,
      );

      return {
        confidence,
        estimatedPrice,
        fit:
          match.compatible && match.score >= 86
            ? "Best fit"
            : match.compatible
              ? "Good fit"
              : "Manual review",
        leadTime:
          spec.urgency === "Rush" && maker.leadDays <= 2
            ? "24h review"
            : maker.eta,
        maker,
        margin,
        reasons: match.reasons,
        score: match.score,
      } satisfies MakerBid;
    })
    .sort((a, b) => b.confidence - a.confidence);
}

function parseEnvelope(dimensions: string) {
  const values = dimensions
    .split(/[xX]/)
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value));

  return {
    x: values[0] ?? 0,
    y: values[1] ?? 0,
    z: values[2] ?? 0,
  };
}

function clampScore(value: number) {
  return Math.min(Math.max(Math.round(value), 1), 99);
}
