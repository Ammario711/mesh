import pg from "pg";

let pool: pg.Pool | null = null;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPostgresPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Postgres storage.");
  }

  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.MESH_PG_POOL_MAX ?? 5),
      ssl:
        process.env.PGSSLMODE === "disable" ||
        process.env.DATABASE_URL.includes("localhost")
          ? false
          : { rejectUnauthorized: false },
    });
  }

  return pool;
}
