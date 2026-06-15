import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  AuditEvent,
  AuthChallenge,
  JobSubmission,
  JobLifecycleEvent,
  MakerApplication,
  PaymentRecord,
  ParsedCadFile,
  UserAccount,
} from "./domain";
import { getPostgresPool, hasDatabaseUrl } from "./postgres";

type MeshDatabase = {
  auditEvents: AuditEvent[];
  authChallenges: AuthChallenge[];
  files: ParsedCadFile[];
  jobEvents: JobLifecycleEvent[];
  jobs: JobSubmission[];
  makerApplications: MakerApplication[];
  payments: PaymentRecord[];
  users: UserAccount[];
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
  updateJob: (job: JobSubmission) => Promise<JobSubmission>;
  listJobEvents: (jobId?: string) => Promise<JobLifecycleEvent[]>;
  createJobEvent: (event: JobLifecycleEvent) => Promise<JobLifecycleEvent>;
  listMakerApplications: () => Promise<MakerApplication[]>;
  createMakerApplication: (
    application: MakerApplication,
  ) => Promise<MakerApplication>;
  updateMakerApplication: (
    application: MakerApplication,
  ) => Promise<MakerApplication>;
  getUserByEmail: (email: string) => Promise<UserAccount | null>;
  upsertUser: (user: UserAccount) => Promise<UserAccount>;
  createAuthChallenge: (challenge: AuthChallenge) => Promise<AuthChallenge>;
  getAuthChallenge: (id: string) => Promise<AuthChallenge | null>;
  updateAuthChallenge: (challenge: AuthChallenge) => Promise<AuthChallenge>;
  listPayments: (jobId?: string) => Promise<PaymentRecord[]>;
  upsertPayment: (payment: PaymentRecord) => Promise<PaymentRecord>;
  listAuditEvents: () => Promise<AuditEvent[]>;
  createAuditEvent: (event: AuditEvent) => Promise<AuditEvent>;
};

const emptyDatabase = (): MeshDatabase => ({
  auditEvents: [],
  authChallenges: [],
  files: [],
  jobEvents: [],
  jobs: [],
  makerApplications: [],
  payments: [],
  users: [],
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

  async updateJob(job: JobSubmission) {
    return this.createJob(job);
  }

  async listJobEvents(jobId?: string) {
    const database = await this.read();

    return database.jobEvents
      .filter((event) => !jobId || event.jobId === jobId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async createJobEvent(event: JobLifecycleEvent) {
    const database = await this.read();
    database.jobEvents = [
      event,
      ...database.jobEvents.filter((current) => current.id !== event.id),
    ].slice(0, 1000);
    await this.write(database);

    return event;
  }

  async listMakerApplications() {
    const database = await this.read();

    return [...database.makerApplications].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }

  async createMakerApplication(application: MakerApplication) {
    const database = await this.read();
    database.makerApplications = [
      application,
      ...database.makerApplications.filter(
        (current) => current.id !== application.id,
      ),
    ].slice(0, 500);
    await this.write(database);

    return application;
  }

  async updateMakerApplication(application: MakerApplication) {
    return this.createMakerApplication(application);
  }

  async getUserByEmail(email: string) {
    const database = await this.read();
    const normalizedEmail = email.toLowerCase();

    return database.users.find((user) => user.email === normalizedEmail) ?? null;
  }

  async upsertUser(user: UserAccount) {
    const database = await this.read();
    database.users = [
      user,
      ...database.users.filter((current) => current.id !== user.id),
    ].slice(0, 1000);
    await this.write(database);

    return user;
  }

  async createAuthChallenge(challenge: AuthChallenge) {
    const database = await this.read();
    database.authChallenges = [
      challenge,
      ...database.authChallenges.filter((current) => current.id !== challenge.id),
    ].slice(0, 1000);
    await this.write(database);

    return challenge;
  }

  async getAuthChallenge(id: string) {
    const database = await this.read();

    return database.authChallenges.find((challenge) => challenge.id === id) ?? null;
  }

  async updateAuthChallenge(challenge: AuthChallenge) {
    return this.createAuthChallenge(challenge);
  }

  async listPayments(jobId?: string) {
    const database = await this.read();

    return database.payments
      .filter((payment) => !jobId || payment.jobId === jobId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async upsertPayment(payment: PaymentRecord) {
    const database = await this.read();
    database.payments = [
      payment,
      ...database.payments.filter((current) => current.id !== payment.id),
    ].slice(0, 1000);
    await this.write(database);

    return payment;
  }

  async listAuditEvents() {
    const database = await this.read();

    return [...database.auditEvents]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 500);
  }

  async createAuditEvent(event: AuditEvent) {
    const database = await this.read();
    database.auditEvents = [
      event,
      ...database.auditEvents.filter((current) => current.id !== event.id),
    ].slice(0, 2000);
    await this.write(database);

    return event;
  }

  private async read(): Promise<MeshDatabase> {
    try {
      const raw = await readFile(this.databasePath, "utf8");
      const parsed = JSON.parse(raw) as MeshDatabase;

      return {
        auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
        authChallenges: Array.isArray(parsed.authChallenges)
          ? parsed.authChallenges
          : [],
        files: Array.isArray(parsed.files) ? parsed.files : [],
        jobEvents: Array.isArray(parsed.jobEvents) ? parsed.jobEvents : [],
        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
        makerApplications: Array.isArray(parsed.makerApplications)
          ? parsed.makerApplications
          : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
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

  async updateJob(job: JobSubmission) {
    return this.createJob(job);
  }

  async listJobEvents(jobId?: string) {
    await this.init();
    const result = await getPostgresPool().query<{
      payload: JobLifecycleEvent;
    }>(
      jobId
        ? "select payload from mesh_job_events where payload->>'jobId' = $1 order by created_at desc limit 500"
        : "select payload from mesh_job_events order by created_at desc limit 500",
      jobId ? [jobId] : [],
    );

    return result.rows.map((row) => row.payload);
  }

  async createJobEvent(event: JobLifecycleEvent) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_job_events (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [event.id, JSON.stringify(event)],
    );

    return event;
  }

  async listMakerApplications() {
    await this.init();
    const result = await getPostgresPool().query<{
      payload: MakerApplication;
    }>(
      "select payload from mesh_maker_applications order by created_at desc limit 500",
    );

    return result.rows.map((row) => row.payload);
  }

  async createMakerApplication(application: MakerApplication) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_maker_applications (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [application.id, JSON.stringify(application)],
    );

    return application;
  }

  async updateMakerApplication(application: MakerApplication) {
    return this.createMakerApplication(application);
  }

  async getUserByEmail(email: string) {
    await this.init();
    const result = await getPostgresPool().query<{ payload: UserAccount }>(
      "select payload from mesh_users where payload->>'email' = $1 limit 1",
      [email.toLowerCase()],
    );

    return result.rows[0]?.payload ?? null;
  }

  async upsertUser(user: UserAccount) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_users (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [user.id, JSON.stringify(user)],
    );

    return user;
  }

  async createAuthChallenge(challenge: AuthChallenge) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_auth_challenges (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [challenge.id, JSON.stringify(challenge)],
    );

    return challenge;
  }

  async getAuthChallenge(id: string) {
    await this.init();
    const result = await getPostgresPool().query<{ payload: AuthChallenge }>(
      "select payload from mesh_auth_challenges where id = $1 limit 1",
      [id],
    );

    return result.rows[0]?.payload ?? null;
  }

  async updateAuthChallenge(challenge: AuthChallenge) {
    return this.createAuthChallenge(challenge);
  }

  async listPayments(jobId?: string) {
    await this.init();
    const result = await getPostgresPool().query<{ payload: PaymentRecord }>(
      jobId
        ? "select payload from mesh_payments where payload->>'jobId' = $1 order by created_at desc limit 500"
        : "select payload from mesh_payments order by created_at desc limit 500",
      jobId ? [jobId] : [],
    );

    return result.rows.map((row) => row.payload);
  }

  async upsertPayment(payment: PaymentRecord) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_payments (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [payment.id, JSON.stringify(payment)],
    );

    return payment;
  }

  async listAuditEvents() {
    await this.init();
    const result = await getPostgresPool().query<{ payload: AuditEvent }>(
      "select payload from mesh_audit_events order by created_at desc limit 500",
    );

    return result.rows.map((row) => row.payload);
  }

  async createAuditEvent(event: AuditEvent) {
    await this.init();
    await getPostgresPool().query(
      `insert into mesh_audit_events (id, payload, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (id) do update
       set payload = excluded.payload, updated_at = now()`,
      [event.id, JSON.stringify(event)],
    );

    return event;
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

        create table if not exists mesh_maker_applications (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists mesh_users (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists mesh_auth_challenges (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists mesh_job_events (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists mesh_payments (
          id text primary key,
          payload jsonb not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists mesh_audit_events (
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
