import { describe, expect, it } from "vitest";

import { signAccessToken, verifyAccessToken } from "../../src/lib/jwt";

describe("access tokens", () => {
  it("round-trips a user id", () => {
    const token = signAccessToken("user-123");
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.type).toBe("access");
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken("user-123");
    const tampered = `${token}tampered`;

    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("rejects garbage input", () => {
    expect(() => verifyAccessToken("not-a-real-token")).toThrow();
  });
});
