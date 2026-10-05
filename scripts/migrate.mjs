import fs from "node:fs";
import pg from "pg";

const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const sql = fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const rawUrl = process.env.DATABASE_URL;
const parsed = new URL(rawUrl);
const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
parsed.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: parsed.toString(),
  ssl: local ? false : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(sql);
  console.log("MIGRATED");
} finally {
  await client.end();
}
