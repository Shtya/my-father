const base = "http://127.0.0.1:3000";
let cookie = "";

async function api(path, body) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.getSetCookie?.() || [];
  const raw = setCookie.find((item) => item.startsWith("farm_session="));
  if (raw) cookie = raw.split(";")[0];
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ${response.status} ${data.error || ""}`);
  return data;
}

const pages = ["/home", "/cycle", "/market", "/more", "/expenses", "/sales", "/customers", "/inventory", "/articles", "/reports", "/settings", "/simulator", "/log"];
for (const page of pages) {
  const response = await fetch(base + page, { headers: { Cookie: cookie } });
  const html = await response.text();
  const emoji = /[\u{1F300}-\u{1FAFF}]/u.test(html);
  const rtl = html.includes('dir="rtl"');
  const arabic = /[\u0600-\u06FF]/.test(html);
  console.log(`${page} ${response.status} rtl=${rtl} emoji=${emoji} arabic=${arabic}`);
  if (response.status !== 200 || emoji || !rtl || !arabic) process.exitCode = 1;
}

import fs from "node:fs";
import pg from "pg";
const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !match[1].startsWith("#")) process.env[match[1]] = match[2];
}
const parsed = new URL(process.env.DATABASE_URL);
const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
parsed.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: parsed.toString(),
  ssl: local ? false : { rejectUnauthorized: false },
});
await client.connect();
await client.query("UPDATE farms SET password_hash = NULL, name = 'بيت عبد الرحمن', owner_name = 'عبد الرحمن'");
await client.end();
console.log("SETUP_RESET");

