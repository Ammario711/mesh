export type MaterialKey = "PLA" | "ABS" | "PETG";
export type InfillKey = "20%" | "50%" | "100%";
export type FinishKey = "Draft" | "Standard" | "Vapor Smooth";
export type ToleranceKey = "Standard" | "Tight";
export type UrgencyKey = "Standard" | "Rush";
export type CadFileType = "STL" | "STEP";
export type ParseSource = "Exact STL mesh" | "STEP estimate";

export type MaterialOption = {
  name: MaterialKey;
  rate: number;
  description: string;
};

export type InfillOption = {
  label: InfillKey;
  multiplier: number;
  description: string;
};

export type FinishOption = {
  label: FinishKey;
  multiplier: number;
  description: string;
};

export type ToleranceOption = {
  label: ToleranceKey;
  multiplier: number;
  description: string;
};

export type UrgencyOption = {
  label: UrgencyKey;
  multiplier: number;
  leadTime: string;
  description: string;
};

export type Maker = {
  id: number;
  name: string;
  machine: string;
  distance: string;
  distanceMiles: number;
  rating: string;
  eta: string;
  leadDays: number;
  capacity: string;
  materials: MaterialKey[];
  processes: string[];
  tags: string[];
};

export type MakerApplicationStatus =
  | "Submitted"
  | "Reviewing"
  | "Approved"
  | "Declined";

export type MakerApplication = {
  id: string;
  shopName: string;
  contactName: string;
  email: string;
  city: string;
  postalCode: string;
  equipment: string;
  materials: string[];
  processes: string[];
  capacity: string;
  notes: string;
  status: MakerApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type UserRole = "buyer" | "maker" | "admin";

export type UserAccount = {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
  stripeAccountId?: string;
  stripeOnboardedAt?: string;
};

export type AuthChallenge = {
  codeHash: string;
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  purpose: "login";
  role: UserRole;
  usedAt?: string;
};

export type AuditEvent = {
  actorEmail?: string;
  createdAt: string;
  id: string;
  metadata: Record<string, string | number | boolean | null>;
  targetId?: string;
  type: string;
};

export type JobLifecycleEvent = {
  actorEmail?: string;
  createdAt: string;
  id: string;
  jobId: string;
  note: string;
  status: JobStatus;
};

export type PaymentRecord = {
  amount: number;
  checkoutUrl?: string;
  createdAt: string;
  currency: "cad" | "usd";
  id: string;
  jobId: string;
  provider: "stripe";
  providerSessionId?: string;
  status: "Pending" | "Checkout Created" | "Paid" | "Failed";
};

export type ParsedCadFile = {
  id: string;
  name: string;
  type: CadFileType;
  size: string;
  sizeBytes: number;
  volume: number;
  dimensions: string;
  tolerance: string;
  triangleCount: number | null;
  source: ParseSource;
  note: string;
  uploadedAt: string;
  storageKey?: string;
  downloadUrl?: string;
};

export type JobStatus =
  | "Sent"
  | "Quote Sent"
  | "Accepted"
  | "In Production"
  | "Ready";

export type JobSubmission = {
  id: string;
  projectName: string;
  fileName: string;
  makerName: string;
  machine: string;
  material: MaterialKey;
  infill: InfillKey;
  finish: FinishKey;
  tolerance: ToleranceKey;
  urgency: UrgencyKey;
  quantity: number;
  unitPrice: number;
  price: number;
  platformFee: number;
  turnaround: string;
  matchScore: number;
  notes: string;
  status: JobStatus;
  sentAt: string;
};

export type QuoteSpec = {
  material: MaterialKey;
  infill: InfillKey;
  finish: FinishKey;
  toleranceTarget: ToleranceKey;
  urgency: UrgencyKey;
  quantity: number;
};

export type QuoteResult = {
  price: number;
  unitPrice: number;
  materialCost: number;
  setupFee: number;
  finishFee: number;
  urgencyFee: number;
  platformFee: number;
  quantityDiscount: number;
  selectedMaterial: MaterialOption;
  selectedInfill: InfillOption;
  selectedFinish: FinishOption;
  selectedTolerance: ToleranceOption;
  selectedUrgency: UrgencyOption;
  turnaround: string;
};

export type MakerMatch = {
  maker: Maker;
  score: number;
  compatible: boolean;
  reasons: string[];
};

export const materialOptions: MaterialOption[] = [
  { name: "PLA", rate: 0.35, description: "Fast prototype finish" },
  { name: "ABS", rate: 0.42, description: "Heat-tolerant functional parts" },
  { name: "PETG", rate: 0.48, description: "Durable, clean layer bonding" },
];

export const infillOptions: InfillOption[] = [
  { label: "20%", multiplier: 1, description: "Light validation model" },
  { label: "50%", multiplier: 1.35, description: "Balanced functional part" },
  { label: "100%", multiplier: 2.15, description: "Maximum density output" },
];

export const finishOptions: FinishOption[] = [
  { label: "Draft", multiplier: 1, description: "Fastest print settings" },
  {
    label: "Standard",
    multiplier: 1.12,
    description: "Clean layers, inspected finish",
  },
  {
    label: "Vapor Smooth",
    multiplier: 1.32,
    description: "Post-processed surface finish",
  },
];

export const toleranceOptions: ToleranceOption[] = [
  {
    label: "Standard",
    multiplier: 1,
    description: "+/- 0.30 mm production target",
  },
  {
    label: "Tight",
    multiplier: 1.18,
    description: "+/- 0.15 mm inspection target",
  },
];

export const urgencyOptions: UrgencyOption[] = [
  {
    label: "Standard",
    multiplier: 1,
    leadTime: "2-3 days",
    description: "Best price across nearby makers",
  },
  {
    label: "Rush",
    multiplier: 1.22,
    leadTime: "24 hours",
    description: "Prioritized queue and same-day review",
  },
];

export const makers: Maker[] = [
  {
    id: 1,
    name: "MakerSpace Mississauga",
    machine: "Prusa MK4",
    distance: "2.4 miles away",
    distanceMiles: 2.4,
    rating: "4.9",
    eta: "Ready today",
    leadDays: 1,
    capacity: "6 parts/day",
    materials: ["PLA", "PETG"],
    processes: ["FDM"],
    tags: ["FDM", "PLA/PETG", "Student friendly"],
  },
  {
    id: 2,
    name: "ForgeLab Etobicoke",
    machine: "Bambu X1 Carbon",
    distance: "5.8 miles away",
    distanceMiles: 5.8,
    rating: "4.8",
    eta: "Ships tomorrow",
    leadDays: 2,
    capacity: "12 parts/day",
    materials: ["PLA", "ABS", "PETG"],
    processes: ["FDM"],
    tags: ["FDM", "ABS", "Tight tolerance"],
  },
  {
    id: 3,
    name: "Northline CNC & Print",
    machine: "Shapeoko Pro CNC",
    distance: "8.1 miles away",
    distanceMiles: 8.1,
    rating: "4.7",
    eta: "2 day queue",
    leadDays: 3,
    capacity: "Batch runs",
    materials: ["ABS", "PETG"],
    processes: ["CNC", "FDM"],
    tags: ["CNC", "Nylon", "Batch runs"],
  },
];

export const defaultQuoteSpec: QuoteSpec = {
  material: "PLA",
  infill: "20%",
  finish: "Standard",
  toleranceTarget: "Standard",
  urgency: "Standard",
  quantity: 1,
};

export function calculateQuote(
  activeFile: ParsedCadFile,
  spec: QuoteSpec,
): QuoteResult {
  const selectedMaterial =
    materialOptions.find((option) => option.name === spec.material) ??
    materialOptions[0];
  const selectedInfill =
    infillOptions.find((option) => option.label === spec.infill) ??
    infillOptions[0];
  const selectedFinish =
    finishOptions.find((option) => option.label === spec.finish) ??
    finishOptions[1];
  const selectedTolerance =
    toleranceOptions.find((option) => option.label === spec.toleranceTarget) ??
    toleranceOptions[0];
  const selectedUrgency =
    urgencyOptions.find((option) => option.label === spec.urgency) ??
    urgencyOptions[0];
  const safeQuantity = normalizeQuantity(spec.quantity);
  const setupFee = activeFile.source === "Exact STL mesh" ? 4.99 : 9.5;
  const materialCost = activeFile.volume * selectedMaterial.rate;
  const perPartBase =
    materialCost *
    selectedInfill.multiplier *
    selectedFinish.multiplier *
    selectedTolerance.multiplier;
  const quantityDiscount =
    safeQuantity >= 25
      ? 0.18
      : safeQuantity >= 10
        ? 0.12
        : safeQuantity >= 4
          ? 0.06
          : 0;
  const discountedParts = perPartBase * safeQuantity * (1 - quantityDiscount);
  const urgencyFee =
    selectedUrgency.label === "Rush"
      ? Math.max(8, discountedParts * (selectedUrgency.multiplier - 1))
      : 0;
  const platformFee = Math.max(
    1.5,
    (discountedParts + setupFee + urgencyFee) * 0.035,
  );
  const price = discountedParts + setupFee + urgencyFee + platformFee;

  return {
    price,
    unitPrice: price / safeQuantity,
    materialCost,
    setupFee,
    finishFee:
      perPartBase * safeQuantity -
      materialCost * selectedInfill.multiplier * safeQuantity,
    urgencyFee,
    platformFee,
    quantityDiscount,
    selectedMaterial,
    selectedInfill,
    selectedFinish,
    selectedTolerance,
    selectedUrgency,
    turnaround: selectedUrgency.leadTime,
  };
}

export function matchMakers(spec: Pick<QuoteSpec, "material" | "quantity" | "toleranceTarget" | "urgency">) {
  return makers
    .map((maker) => scoreMaker(maker, spec))
    .sort((a, b) => b.score - a.score);
}

export function scoreMaker(
  maker: Maker,
  spec: {
    material: MaterialKey;
    quantity: number;
    toleranceTarget: ToleranceKey;
    urgency: UrgencyKey;
  },
): MakerMatch {
  const reasons: string[] = [];
  let score = 55;
  const compatibleMaterial = maker.materials.includes(spec.material);
  const supportsRush = maker.leadDays <= 2;
  const supportsTightTolerance =
    spec.toleranceTarget === "Standard" || maker.tags.includes("Tight tolerance");
  const capacityNumber = Number.parseInt(maker.capacity, 10);
  const capacityFits =
    Number.isNaN(capacityNumber) ||
    normalizeQuantity(spec.quantity) <= capacityNumber * 3;

  if (compatibleMaterial) {
    score += 18;
    reasons.push(`${spec.material} available`);
  } else {
    score -= 22;
    reasons.push(`${spec.material} requires review`);
  }

  if (maker.distanceMiles <= 3) {
    score += 10;
    reasons.push("closest pickup");
  } else if (maker.distanceMiles <= 6) {
    score += 6;
    reasons.push("nearby");
  }

  if (spec.urgency === "Rush") {
    if (supportsRush) {
      score += 12;
      reasons.push("rush capable");
    } else {
      score -= 12;
      reasons.push("rush queue risk");
    }
  } else {
    score += Math.max(0, 8 - maker.leadDays * 2);
    reasons.push(maker.eta.toLowerCase());
  }

  if (supportsTightTolerance) {
    score += 8;
    reasons.push("tolerance fit");
  } else {
    score -= 10;
    reasons.push("tolerance review");
  }

  if (capacityFits) {
    score += 7;
    reasons.push("capacity fit");
  } else {
    score -= 8;
    reasons.push("batch capacity review");
  }

  return {
    maker,
    score: Math.round(clamp(score, 10, 99)),
    compatible: compatibleMaterial && supportsTightTolerance && capacityFits,
    reasons,
  };
}

export function normalizeQuantity(value: number) {
  return clamp(Math.round(value), 1, 250);
}

export function getCadFileType(name: string): CadFileType | null {
  const lowerName = name.toLowerCase();

  if (lowerName.endsWith(".stl")) {
    return "STL";
  }

  if (lowerName.endsWith(".step") || lowerName.endsWith(".stp")) {
    return "STEP";
  }

  return null;
}

export function isSupportedCadFile(name: string) {
  return Boolean(getCadFileType(name));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function countMatches(value: string, token: string) {
  return value.split(token).length - 1;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
