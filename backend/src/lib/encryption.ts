import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { env } from "../env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const key = Buffer.from(env.ENCRYPTION_KEY, "base64");

if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key (AES-256)");
}

/** Returns `iv.authTag.ciphertext`, each part base64-encoded. */
export function encryptValue(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((part) => part.toString("base64")).join(".");
}

export function decryptValue(payload: string): string {
  const [ivPart, authTagPart, ciphertextPart] = payload.split(".");

  if (!ivPart || !authTagPart || !ciphertextPart) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(authTagPart, "base64");
  const ciphertext = Buffer.from(ciphertextPart, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
