import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getCadFileType, isSupportedCadFile } from "./domain";

export type StoredUpload = {
  contentType: string;
  downloadUrl: string;
  sizeBytes: number;
  storageKey: string;
};

const defaultMaxUploadMb = 80;

export async function saveCadUpload(file: File, fileId: string): Promise<StoredUpload> {
  validateCadUpload(file);
  const uploadDirectory = resolveUploadDirectory();
  const storageKey = `${Date.now()}-${fileId}-${safeFileName(file.name)}`;
  const uploadPath = path.join(uploadDirectory, storageKey);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(uploadPath, buffer);

  return {
    contentType: file.type || contentTypeForCadFile(file.name),
    downloadUrl: `/api/uploads/${encodeURIComponent(storageKey)}`,
    sizeBytes: file.size,
    storageKey,
  };
}

export async function readCadUpload(storageKey: string) {
  const safeKey = path.basename(storageKey);
  const filePath = path.join(resolveUploadDirectory(), safeKey);
  const buffer = await readFile(filePath);

  return {
    buffer,
    contentType: contentTypeForCadFile(safeKey),
  };
}

export function validateCadUpload(file: File) {
  if (!isSupportedCadFile(file.name)) {
    throw new Error("Only .STL, .STEP, and .STP files are supported.");
  }

  if (file.size === 0) {
    throw new Error("That CAD file is empty.");
  }

  const maxBytes =
    Number(process.env.MESH_MAX_UPLOAD_MB ?? defaultMaxUploadMb) * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(
      `CAD files must be ${process.env.MESH_MAX_UPLOAD_MB ?? defaultMaxUploadMb} MB or smaller.`,
    );
  }
}

function resolveUploadDirectory() {
  const baseDir =
    process.env.MESH_DATA_DIR ??
    (process.env.VERCEL
      ? path.join(os.tmpdir(), "mesh-data")
      : path.join(process.cwd(), ".mesh-data"));

  return path.join(baseDir, "uploads");
}

function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function contentTypeForCadFile(name: string) {
  const type = getCadFileType(name);

  if (type === "STL") {
    return "model/stl";
  }

  return "model/step";
}
