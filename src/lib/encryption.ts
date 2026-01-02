import Cryptr from "cryptr";
import crypto from "crypto";

const cryptr = new Cryptr(process.env.ENCRYPTION_KEY!);

export const encrypt = (text: string) => cryptr.encrypt(text);
export const decrypt = (text: string) => cryptr.decrypt(text);

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  const prefix = "aurea_sk_live_";
  const randomBytes = crypto.randomBytes(32).toString("hex");
  return prefix + randomBytes;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Verify an API key against a hash
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  return hashApiKey(apiKey) === hash;
}
