import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../../src/lib/password";

describe("password hashing", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("correct-password");

    expect(hash).not.toBe("correct-password");
    expect(await verifyPassword("correct-password", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-password");

    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("only considers the first 72 bytes", async () => {
    const longPassword = "a".repeat(100);
    const hash = await hashPassword(longPassword);

    expect(await verifyPassword("a".repeat(72), hash)).toBe(true);
  });
});
