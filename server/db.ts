import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function getDatabaseUrl() {
  return process.env.SUPABASE_DB_URL;
}

export async function getSetupStatus() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    return {
      configuredDbAccess: false,
      tablesReady: false,
      details:
        "SUPABASE_DB_URL is not set on the server, so schema bootstrap cannot run automatically.",
    };
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    const result = await client.query<{
      programs: string | null;
      exercise_logs: string | null;
    }>(
      `select to_regclass('public.programs') as programs, to_regclass('public.exercise_logs') as exercise_logs`,
    );

    const row = result.rows[0];
    const tablesReady = Boolean(row?.programs && row?.exercise_logs);

    return {
      configuredDbAccess: true,
      tablesReady,
      details: tablesReady
        ? "The required tables already exist."
        : "Connected to Postgres, but the required tables are missing.",
    };
  } finally {
    await client.end();
  }
}

export async function bootstrapDatabase() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is not configured.");
  }

  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  return getSetupStatus();
}
