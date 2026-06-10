import {
  defaultQuoteSpec,
  finishOptions,
  getCadFileType,
  infillOptions,
  materialOptions,
  type MakerApplication,
  normalizeQuantity,
  type FinishKey,
  type InfillKey,
  type JobStatus,
  type JobSubmission,
  type MaterialKey,
  type ParsedCadFile,
  type QuoteSpec,
  type ToleranceKey,
  type UrgencyKey,
  toleranceOptions,
  urgencyOptions,
} from "./domain";

const jobStatuses: JobStatus[] = [
  "Sent",
  "Quote Sent",
  "Accepted",
  "In Production",
  "Ready",
];

export function parseQuoteSpec(input: unknown): QuoteSpec {
  const value = asRecord(input);

  return {
    material: parseMaterial(value.material),
    infill: parseInfill(value.infill),
    finish: parseFinish(value.finish),
    toleranceTarget: parseTolerance(value.toleranceTarget ?? value.tolerance),
    urgency: parseUrgency(value.urgency),
    quantity: normalizeQuantity(readNumber(value.quantity, defaultQuoteSpec.quantity)),
  };
}

export function parseParsedCadFile(input: unknown): ParsedCadFile {
  const value = asRecord(input);
  const name = readString(value.name, "CAD file");
  const type = getCadFileType(name) ?? readString(value.type, "STL");

  if (type !== "STL" && type !== "STEP") {
    throw new Error("CAD file type must be STL or STEP.");
  }

  return {
    id: readString(value.id, `${name}-${Date.now()}`),
    name,
    type,
    size: readString(value.size, "0 B"),
    sizeBytes: readNumber(value.sizeBytes, 0),
    volume: readNumber(value.volume, 0.1),
    dimensions: readString(value.dimensions, "--"),
    tolerance: readString(value.tolerance, "--"),
    triangleCount:
      value.triangleCount === null || value.triangleCount === undefined
        ? null
        : readNumber(value.triangleCount, 0),
    source:
      value.source === "STEP estimate" ? "STEP estimate" : "Exact STL mesh",
    note: readString(value.note, "Uploaded to Mesh."),
    uploadedAt: readString(value.uploadedAt, new Date().toISOString()),
    storageKey:
      typeof value.storageKey === "string" ? value.storageKey : undefined,
    downloadUrl:
      typeof value.downloadUrl === "string" ? value.downloadUrl : undefined,
  };
}

export function parseJobSubmission(input: unknown): JobSubmission {
  const value = asRecord(input);

  return {
    id: readString(value.id, `job-${Date.now()}`),
    projectName: readString(value.projectName, "Untitled manufacturing job"),
    fileName: readString(value.fileName, "CAD file"),
    makerName: readString(value.makerName, "Local maker"),
    machine: readString(value.machine, "Manufacturing equipment"),
    material: parseMaterial(value.material),
    infill: parseInfill(value.infill),
    finish: parseFinish(value.finish),
    tolerance: parseTolerance(value.tolerance),
    urgency: parseUrgency(value.urgency),
    quantity: normalizeQuantity(readNumber(value.quantity, 1)),
    unitPrice: readNumber(value.unitPrice, 0),
    price: readNumber(value.price, 0),
    platformFee: readNumber(value.platformFee, 0),
    turnaround: readString(value.turnaround, "2-3 days"),
    matchScore: readNumber(value.matchScore, 70),
    notes: readString(value.notes, ""),
    status: parseJobStatus(value.status),
    sentAt: readString(value.sentAt, new Date().toISOString()),
  };
}

export function parseMakerApplication(input: unknown): MakerApplication {
  const value = asRecord(input);
  const submittedAt = readString(value.submittedAt, new Date().toISOString());
  const shopName = readString(value.shopName, "");
  const email = readString(value.email, "").toLowerCase();

  if (!shopName) {
    throw new Error("Shop name is required.");
  }

  if (!isLikelyEmail(email)) {
    throw new Error("A valid contact email is required.");
  }

  return {
    id: readString(value.id, `maker-application-${Date.now()}`),
    shopName,
    contactName: readString(value.contactName, ""),
    email,
    city: readString(value.city, ""),
    postalCode: readString(value.postalCode, ""),
    equipment: readString(value.equipment, ""),
    materials: readStringList(value.materials),
    processes: readStringList(value.processes),
    capacity: readString(value.capacity, ""),
    notes: readString(value.notes, ""),
    status: "Submitted",
    submittedAt,
  };
}

export function parseJsonBody(input: unknown) {
  const value = asRecord(input);

  return value;
}

function parseMaterial(input: unknown): MaterialKey {
  return materialOptions.some((option) => option.name === input)
    ? (input as MaterialKey)
    : defaultQuoteSpec.material;
}

function parseInfill(input: unknown): InfillKey {
  return infillOptions.some((option) => option.label === input)
    ? (input as InfillKey)
    : defaultQuoteSpec.infill;
}

function parseFinish(input: unknown): FinishKey {
  return finishOptions.some((option) => option.label === input)
    ? (input as FinishKey)
    : defaultQuoteSpec.finish;
}

function parseTolerance(input: unknown): ToleranceKey {
  return toleranceOptions.some((option) => option.label === input)
    ? (input as ToleranceKey)
    : defaultQuoteSpec.toleranceTarget;
}

function parseUrgency(input: unknown): UrgencyKey {
  return urgencyOptions.some((option) => option.label === input)
    ? (input as UrgencyKey)
    : defaultQuoteSpec.urgency;
}

function parseJobStatus(input: unknown): JobStatus {
  return jobStatuses.includes(input as JobStatus)
    ? (input as JobStatus)
    : "Quote Sent";
}

function asRecord(input: unknown) {
  if (typeof input !== "object" || input === null) {
    throw new Error("Expected a JSON object.");
  }

  return input as Record<string, unknown>;
}

function readString(input: unknown, fallback: string) {
  return typeof input === "string" && input.trim() ? input.trim() : fallback;
}

function readNumber(input: unknown, fallback: number) {
  const value = typeof input === "number" ? input : Number(input);

  return Number.isFinite(value) ? value : fallback;
}

function readStringList(input: unknown) {
  if (Array.isArray(input)) {
    return input
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  return [];
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
