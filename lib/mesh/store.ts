import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { JobSubmission, ParsedCadFile } from "./domain";
import { getPostgresPool, hasDatabaseUrl } from "./postgres";

type MeshDatabase = {
  files: ParsedCadFile[];
  jobs: JobSubmission[];
  updatedAt: string;
  version: 1;
};

export type MarketplaceStore = {
  adapter: "file" | "postgres";
  listFiles: () => Promise<ParsedCadFile[]>;
  getFile: (id: string) => Promise<ParsedCadFile | null>;
  upsertFile: (file: ParsedCadFile) => Promise<ParsedCadFile>;
  listJobs: () => Promise<JobSubmission[]>;
  createJob: (job: JobSubmission) => Promise<JobSubmission>;
};

const emptyDatabase = (): MeshDatabase => ({
  files: [],
  jobs: [],
  updatedAt: new Date().toISOString(),
  version: 1,
});

let store: MarketplaceStore | null = null;

export function getMarketplaceStore() {
  if (!store) {
    store = hasDatabaseUrl()
      ? new PostgresMarketplaceStore()
      : new FileMarketplaceStore(resolveDatabasePath());
  }

  return store;
}

export function getStorageMode() {
  return hasDatabaseUrl() ? "postgres" : "file";
}

function resolveDatabasePath() {
  const baseDir =
    process.env.MESH_DATA_DIR ??
    (process.env.VERCEL
      ? path.join(os.tmpdir(), "mesh-data")
      : path.join(process.cwd(), ".mesh-data"));

  return path.join(baseDir, "mesh-db.json");
}

class FileMarketplaceStore implements MarketplaceStore {
  adapter = "file" as const;

  constructor(private readonly databasePath: string) {}

  async listFiles() {
    const database = await this.read();

    return [...database.files].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  }

  async getFile(id: string) {
    const database = await this.read();

    return database.files.find((file) => file.id === id) ?? null;
  }

  async upsertFile(file: ParsedCadFile) {
    const database = await this.read();
    database.files = [
      file,
      ...database.files.filter((current) => current.id !== file.id),
    ].slice(0, 200);
    await this.write(database);

    return file;
  }

  async listJobs() {
    const database = await this.read();

    return [...database.jobs].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
  }

  async createJob(job: JobSubmission) {
    const database = await this.read();
    database.jobs = [
      job,
      ...database.jobs.filter((current) => current.id !== job.id),
    ].slice(0, 500);
    await this.write(database);

    return job;
  }

  private async read(): Promise<MeshDatabase> {
    try {
      const raw = await readFile(this.databasePath, "utf8");
      const parsed = JSON.parse(raw) as MeshDatabase;

      return {
        files: Array.isArray(parsed.files) ? parsed.files : [],
        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        version: 1,
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return emptyDatabase();
      }

      throw error;
    }
  }

  private async write(database: MeshDatabase) {
    const nextDatabase = {
      ...database,
      updatedAt: new Date().toISOString(),
      version: 1 as const,
    };
    const directory = path.dirname(this.databasePath);
    const temporaryPath = `${this.databasePath}.${Date.now()}.tmp`;

    await mkdir(directory, { recursive: true });
    await writeFile(
      temporaryPath,
      `${JSON.stringify(nextDatabase, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.databasePath);
  }
}

class PostgresMarketplaceStore implements MarketplaceStore {
  adapter = "postgres" as const;
  private ready: Promise<void> | null = null;

  async listFiles() {
    await this.init();
    const result = await getPostgresPool().query<{ payload: ParsedCadFile }>(
      "select payload from mesh_files order by created_at desc limit 200",
    );

    return result.rows.map((row) => row.payload);
  }

  async getFile(id: string) {
    await this.init();
    const result = await getPostgresPool().query<{ payload: ParsedCadFile }>(
      "select payload from mesh_files where id = $1 limit 1",
      [id],
    );

    return result.rows[0]?.payload ?? null;
  }

  async upsertFile(file: ParsedCadFile) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_files (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [file.id, JSON.stringify(file)],
    );

    return file;
  }

  async listJobs() {
    await this.init();
    const result = await getPostgresPool().query<{ payload: JobSubmission }>(
      "select payload from mesh_jobs order by created_at desc limit 500",
    );

    return result.rows.map((row) => row.payload);
  }

  async createJob(job: JobSubmission) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_jobs (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [job.id, JSON.stringify(job)],
    );

    return job;
  }

  private init() {
    if (!this.ready) {
      this.ready = getPostgresPool().query(`
        create table if not exists mesh_files (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists mesh_jobs (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `).then(() => undefined);
    }

    return this.ready;
  }
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
