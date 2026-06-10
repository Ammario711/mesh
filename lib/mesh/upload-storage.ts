import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getCadFileType, isSupportedCadFile } from "./domain";
import { getPostgresPool, hasDatabaseUrl } from "./postgres";

export type StoredUpload = {
  contentType: string;
  downloadUrl: string;
  sizeBytes: number;
  storageKey: string;
};

const defaultMaxUploadMb = 80;
let uploadsReady: Promise<void> | null = null;

export async function saveCadUpload(file: File, fileId: string): Promise<StoredUpload> {
  validateCadUpload(file);
  const storageKey = `${Date.now()}-${fileId}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || contentTypeForCadFile(file.name);

  if (hasDatabaseUrl()) {
    await initPostgresUploads();
    await getPostgresPool().query(
      `insert into mesh_uploads
        (storage_key, file_name, content_type, size_bytes, bytes, created_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (storage_key) do update
       set file_name = excluded.file_name,
           content_type = excluded.content_type,
           size_bytes = excluded.size_bytes,
           bytes = excluded.bytes`,
      [storageKey, file.name, contentType, file.size, buffer],
    );

    return {
      contentType,
      downloadUrl: `/api/uploads/${encodeURIComponent(storageKey)}`,
      sizeBytes: file.size,
      storageKey,
    };
  }

  const uploadDirectory = resolveUploadDirectory();
  const uploadPath = path.join(uploadDirectory, storageKey);
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(uploadPath, buffer);

  return {
    contentType,
    downloadUrl: `/api/uploads/${encodeURIComponent(storageKey)}`,
    sizeBytes: file.size,
    storageKey,
  };
}

export async function readCadUpload(storageKey: string) {
  const safeKey = path.basename(storageKey);

  if (hasDatabaseUrl()) {
    await initPostgresUploads();
    const result = await getPostgresPool().query<{
      bytes: Buffer;
      content_type: string;
    }>(
      "select bytes, content_type from mesh_uploads where storage_key = $1 limit 1",
      [safeKey],
    );
    const upload = result.rows[0];

    if (!upload) {
      throw new Error("CAD upload not found.");
    }

    return {
      buffer: upload.bytes,
      contentType: upload.content_type,
    };
  }

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

function initPostgresUploads() {
  if (!uploadsReady) {
    uploadsReady = getPostgresPool().query(`
      create table if not exists mesh_uploads (
        storage_key text primary key,
        file_name text not null,
        content_type text not null,
        size_bytes integer not null,
        bytes bytea not null,
        created_at timestamptz not null default now()
      );
    `).then(() => undefined);
  }

  return uploadsReady;
}
