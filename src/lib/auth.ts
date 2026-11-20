/**
 * Tiny admin session: an HMAC-signed, expiring cookie. Uses Web Crypto so it
 * works in both the Node runtime (route handlers) and the Edge runtime
 * (middleware).
 */

export const SESSION_COOKIE = "cb_admin";
const MAX_AGE_S = 60 * 60 * 8;
const DEMO_PASSWORD = "cynbit-demo";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || DEMO_PASSWORD;
}

export function usingDemoPassword(): boolean {
  return !process.env.ADMIN_PASSWORD?.trim();
}

function secret(): string {
  return process.env.SESSION_SECRET?.trim() || `dev-secret:${adminPassword()}`;
}

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = `admin.${exp}`;
  return { value: `${payload}.${await hmac(payload)}`, maxAge: MAX_AGE_S };
}

export async function verifySession(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  return safeEqual(parts[2], await hmac(`${parts[0]}.${parts[1]}`));
}

export async function checkPassword(input: string): Promise<boolean> {
  // Compare HMACs so timing does not leak the password length.
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${adminPassword()}`));
}
