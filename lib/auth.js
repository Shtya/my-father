import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "farm_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET missing");
  return value;
}

export function signSession() {
  const body = Buffer.from(JSON.stringify({
    farmId: 1,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
  })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readToken(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const jar = await cookies();
  return readToken(jar.get(COOKIE)?.value);
}

export async function setSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, signSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

const attempts = new Map();

export function assertLoginAllowed(key) {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || row.reset < now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return;
  }
  row.count += 1;
  if (row.count > 8) {
    const error = new Error("محاولات كثيرة. استنى ربع ساعة وحاول تاني.");
    error.status = 429;
    throw error;
  }
}
