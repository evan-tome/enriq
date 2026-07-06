// Requires a running Postgres instance (docker compose up -d postgres) with
// DATABASE_URL pointing to it and the init migration applied.
import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { type App, buildApp } from "../src/app";
import { env } from "../src/env";
import { prisma } from "../src/lib/prisma";
import { credentials, login, register, registerAndLogin } from "./helpers";

describe("auth flow", () => {
  let app: App;

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers a new user", async () => {
    const response = await register(app);

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.email).toBe(credentials.email);
    expect(body.id).toEqual(expect.any(String));
  });

  it("rejects duplicate registration", async () => {
    await register(app);

    const response = await register(app);

    expect(response.statusCode).toBe(409);
  });

  it("logs in and returns an access token plus refresh cookie", async () => {
    await register(app);

    const response = await login(app);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ token_type: "bearer" });
    expect(response.json().access_token).toEqual(expect.any(String));
    expect(response.cookies.some((cookie) => cookie.name === env.REFRESH_COOKIE_NAME)).toBe(true);
  });

  it("rejects login with the wrong password", async () => {
    await register(app);

    const response = await login(app, { email: credentials.email, password: "wrong-password" });

    expect(response.statusCode).toBe(401);
  });

  it("returns the current user for an authenticated request", async () => {
    const { accessToken } = await registerAndLogin(app);

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().email).toBe(credentials.email);
  });

  it("rejects /users/me without a token", async () => {
    const response = await app.inject({ method: "GET", url: "/users/me" });

    expect(response.statusCode).toBe(401);
  });

  it("rotates the refresh token on /auth/refresh", async () => {
    const { refreshCookie } = await registerAndLogin(app);

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      cookies: { [env.REFRESH_COOKIE_NAME]: refreshCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().access_token).toEqual(expect.any(String));

    const reuse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      cookies: { [env.REFRESH_COOKIE_NAME]: refreshCookie },
    });

    expect(reuse.statusCode).toBe(401);
  });

  it("logs out and revokes the refresh token", async () => {
    const { refreshCookie } = await registerAndLogin(app);

    const logout = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { [env.REFRESH_COOKIE_NAME]: refreshCookie },
    });
    expect(logout.statusCode).toBe(200);

    const refresh = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      cookies: { [env.REFRESH_COOKIE_NAME]: refreshCookie },
    });
    expect(refresh.statusCode).toBe(401);
  });

  it("rate limits repeated login attempts", async () => {
    await register(app);

    const attempts = Array.from({ length: env.RATE_LIMIT_LOGIN_MAX + 1 }, () =>
      login(app, { email: credentials.email, password: "wrong-password" }),
    );
    const responses = await Promise.all(attempts);

    expect(responses.some((response) => response.statusCode === 429)).toBe(true);
  });
});
