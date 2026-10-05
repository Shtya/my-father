import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, ".pgdata");
const bin = "C:\\Program Files\\PostgreSQL\\17\\bin";
const port = 5434;
const password = randomBytes(18).toString("base64url");
const authSecret = randomBytes(32).toString("base64url");
const envPath = path.join(root, ".env.local");

if (fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
  console.log("LOCAL_DB_EXISTS");
  process.exit(0);
}

fs.mkdirSync(dataDir, { recursive: true });
const pwFile = path.join(root, ".pg-init-password");
fs.writeFileSync(pwFile, password, { encoding: "utf8" });

const init = spawnSync(
  path.join(bin, "initdb.exe"),
  ["-D", dataDir, "-U", "postgres", "-E", "UTF8", "--locale=C", "--auth=scram-sha-256", `--pwfile=${pwFile}`],
  { encoding: "utf8", windowsHide: true }
);
fs.rmSync(pwFile, { force: true });
if (init.status !== 0) {
  console.error(init.stderr || init.stdout);
  process.exit(init.status || 1);
}

const confPath = path.join(dataDir, "postgresql.conf");
let conf = fs.readFileSync(confPath, "utf8");
conf = conf.replace(/^#?port = .*/m, `port = ${port}`);
conf = conf.replace(/^#?listen_addresses = .*/m, "listen_addresses = '127.0.0.1'");
fs.writeFileSync(confPath, conf);

const start = spawnSync(path.join(bin, "pg_ctl.exe"), ["-D", dataDir, "-l", path.join(dataDir, "server.log"), "-w", "-t", "30", "start"], {
  encoding: "utf8",
  windowsHide: true,
  stdio: "ignore",
});
if (start.status !== 0) {
  console.error(start.stderr || start.stdout);
  process.exit(start.status || 1);
}

const databaseUrl = `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/poultry_farm`;
fs.writeFileSync(envPath, `DATABASE_URL=${databaseUrl}\nAUTH_SECRET=${authSecret}\n`, { encoding: "utf8" });

const created = spawnSync(
  path.join(bin, "psql.exe"),
  ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE poultry_farm"],
  { encoding: "utf8", windowsHide: true, env: { ...process.env, PGPASSWORD: password } }
);
if (created.status !== 0 && !/already exists/i.test(created.stderr || "")) {
  console.error(created.stderr || created.stdout);
  process.exit(created.status || 1);
}

console.log("LOCAL_DB_READY");
