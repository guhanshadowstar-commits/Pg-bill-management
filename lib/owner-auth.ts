export const OWNER_SESSION_COOKIE = "pg_owner_session";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_HASH_ITERATIONS = 210_000;
type OwnerCredential = { username: string; password: string };
export type EnvOwnerLogin = { username: string; owner_id: string };
export type OwnerSession = {
  role: "pg_owner";
  username: string;
  owner_id: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return decoder.decode(bytes);
}

function getSessionSecret() {
  return (
    process.env.OWNER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.PG_OWNER_ACCOUNTS ||
    process.env.PG_OWNER_PASSWORD ||
    (process.env.NODE_ENV === "production" ? "" : "dev-only-owner-session-secret") ||
    ""
  );
}

async function sign(message: string) {
  const secret = getSessionSecret();
  if (!secret) return "";

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes);
  return copy.buffer;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
    key,
    256
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

export function getOwnerUsername() {
  return process.env.PG_OWNER_USERNAME || "owner";
}

export function normalizeOwnerId(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "owner";
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function hashOwnerPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_HASH_ITERATIONS}$${bytesToBase64Url(salt)}$${hash}`;
}

export async function verifyOwnerPassword(password: string, storedHash: string) {
  const [algorithm, iterationsRaw, saltRaw, expectedHash] = storedHash.split("$");
  const iterations = Number(iterationsRaw);

  if (algorithm !== "pbkdf2_sha256" || !Number.isFinite(iterations) || !saltRaw || !expectedHash) {
    return false;
  }

  const actualHash = await derivePasswordHash(password, base64UrlToBytes(saltRaw), iterations);
  return safeEqual(actualHash, expectedHash);
}

function getOwnerCredentials(): OwnerCredential[] {
  const multiOwnerAccounts = (process.env.PG_OWNER_ACCOUNTS || "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex <= 0) return null;

      const username = pair.slice(0, separatorIndex).trim();
      const password = pair.slice(separatorIndex + 1);
      if (!username || !password) return null;

      return { username, password };
    })
    .filter((account): account is OwnerCredential => Boolean(account));

  if (multiOwnerAccounts.length > 0) return multiOwnerAccounts;

  const singleOwnerPassword = process.env.PG_OWNER_PASSWORD || "";
  if (!singleOwnerPassword) return [];

  return [{ username: getOwnerUsername(), password: singleOwnerPassword }];
}

export function hasOwnerPassword() {
  return getOwnerCredentials().length > 0;
}

export function getValidEnvOwnerLogin(username: string, password: string): EnvOwnerLogin | null {
  const normalizedUsername = normalizeUsername(username);
  const account = getOwnerCredentials().find((credential) => {
    return safeEqual(normalizedUsername, normalizeUsername(credential.username)) && safeEqual(password, credential.password);
  });

  if (!account) return null;

  return {
    username: account.username.trim(),
    owner_id: normalizeOwnerId(account.username)
  };
}

export async function createOwnerSession(username: string, ownerId = normalizeOwnerId(username)) {
  const cleanUsername = username.trim();
  const payload = base64UrlEncode(
    JSON.stringify({
      role: "pg_owner",
      username: cleanUsername,
      owner_id: ownerId,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    })
  );
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function readOwnerSession(token?: string): Promise<OwnerSession | null> {
  if (!token || !getSessionSecret()) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await sign(payload);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<OwnerSession>;
    const isValid =
      parsed.role === "pg_owner" &&
      typeof parsed.username === "string" &&
      typeof parsed.exp === "number" &&
      parsed.exp > Math.floor(Date.now() / 1000);

    if (!isValid) return null;

    return {
      role: "pg_owner",
      username: parsed.username!,
      owner_id: parsed.owner_id || normalizeOwnerId(parsed.username!),
      exp: parsed.exp!
    };
  } catch {
    return null;
  }
}

export async function verifyOwnerSession(token?: string) {
  return Boolean(await readOwnerSession(token));
}

export async function getOwnerSessionFromRequest(req: Request) {
  const cookies = Object.fromEntries(
    (req.headers.get("cookie") || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf("=");
        if (separatorIndex === -1) return [cookie, ""];
        return [cookie.slice(0, separatorIndex), decodeURIComponent(cookie.slice(separatorIndex + 1))];
      })
  );

  return readOwnerSession(cookies[OWNER_SESSION_COOKIE]);
}

export { SESSION_TTL_SECONDS };
