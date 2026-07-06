import { describe, expect, it } from "@jest/globals";

import { generateRefreshToken, hashRefreshToken } from "../../src/lib/refreshToken";

describe("refresh tokens", () => {
  it("generates unique, url-safe tokens", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes deterministically to a 64-character hex string", () => {
    const token = generateRefreshToken();

    const hashA = hashRefreshToken(token);
    const hashB = hashRefreshToken(token);

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
  });
});
