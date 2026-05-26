import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * AES-256-GCM encryption for credentials at rest.
 *
 * The encryption key comes from ENCRYPTION_KEY env var — a 64-char hex string
 * (32 bytes). Generate with: `openssl rand -hex 32`. NEVER commit this key.
 *
 * If the env var is missing in dev, we derive a deterministic key from NEXTAUTH_SECRET
 * so the app still works locally — this is INSECURE for production but acceptable
 * for the MVP demo. Production deployments must set ENCRYPTION_KEY explicitly.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY env var is required in production (64-char hex). Generate with: openssl rand -hex 32");
  }
  // Dev fallback — derive from NEXTAUTH_SECRET
  const seed = process.env.NEXTAUTH_SECRET || "launchstack-dev-fallback-key";
  return createHash("sha256").update(seed).digest();
}

export type EncryptedBlob = { v: 1; iv: string; ct: string; tag: string };

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob: EncryptedBlob = { v: 1, iv: iv.toString("base64"), ct: ct.toString("base64"), tag: tag.toString("base64") };
  return JSON.stringify(blob);
}

export function decrypt(serialized: string): string {
  const blob = JSON.parse(serialized) as EncryptedBlob;
  if (blob.v !== 1) throw new Error("unknown ciphertext version");
  const key = getKey();
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const ct = Buffer.from(blob.ct, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/** Encrypt arbitrary object → string. */
export function encryptJson(obj: unknown): string {
  return encrypt(JSON.stringify(obj));
}

/** Decrypt → parsed object. */
export function decryptJson<T = unknown>(serialized: string): T {
  return JSON.parse(decrypt(serialized)) as T;
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Generate a short opaque ID for /go TID injection (URL-safe, 16 chars). */
export function shortToken(len = 16): string {
  return randomBytes(Math.ceil(len * 3 / 4)).toString("base64url").slice(0, len);
}

/** HMAC-SHA1 — ClickBank INS 6.0 used SHA1; INS 7.0 supports SHA-256. */
export function hmacSha1(secret: string, payload: string): string {
  return createHmac("sha1", secret).update(payload).digest("hex");
}

export function hmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** SHA-256 hex — used to hash PII before sending to CAPI (Meta, Google, TikTok). */
export function sha256(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}
