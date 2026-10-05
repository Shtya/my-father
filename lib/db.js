import pg from "pg";

const { Pool, types } = pg;

types.setTypeParser(1082, (value) => value);
types.setTypeParser(1700, (value) => value);

function connectionConfig(value) {
  if (!value) return {};
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: false },
  };
}

export const pool = globalThis.__poultryPool || new Pool({
  ...connectionConfig(process.env.DATABASE_URL),
  max: process.env.VERCEL ? 1 : 10,
});

if (process.env.NODE_ENV !== "production") {
  globalThis.__poultryPool = pool;
}

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection already failed */
    }
    throw error;
  } finally {
    client.release();
  }
}
