import { describe, expect, it } from "vitest";

import { decryptValue, encryptValue } from "../../src/lib/encryption";

describe("AES-256-GCM encryption", () => {
  it("round-trips a value", () => {
    const plaintext = "super-secret-api-token";

    const ciphertext = encryptValue(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(decryptValue(ciphertext)).toBe(plaintext);
  });

  it("produces a dot-delimited iv.authTag.ciphertext payload", () => {
    const ciphertext = encryptValue("value");

    expect(ciphertext.split(".")).toHaveLength(3);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptValue("value");
    const b = encryptValue("value");

    expect(a).not.toBe(b);
  });
});
