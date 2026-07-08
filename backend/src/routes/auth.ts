import type { CookieSerializeOptions } from "@fastify/cookie";

import type { App } from "../app";
import { env } from "../env";
import { UnauthorizedError } from "../lib/errors";
import { loginBodySchema, registerBodySchema, tokenResponseSchema } from "../schemas/auth.schema";
import { userPublicSchema } from "../schemas/user.schema";
import {
  authenticateUser,
  createTokenPair,
  registerUser,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../services/authService";

const REFRESH_COOKIE_OPTIONS: CookieSerializeOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.COOKIE_SECURE,
  path: env.REFRESH_COOKIE_PATH,
  maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60,
};

export async function authRoutes(app: App) {
  app.post(
    "/register",
    { schema: { body: registerBodySchema, response: { 201: userPublicSchema } } },
    async (request, reply) => {
      const user = await registerUser(request.body.email, request.body.password);
      return reply.status(201).send(user);
    },
  );

  app.post(
    "/login",
    { schema: { body: loginBodySchema, response: { 200: tokenResponseSchema } } },
    async (request, reply) => {
      const user = await authenticateUser(request.body.email, request.body.password);
      const tokens = await createTokenPair(user.id);

      reply.setCookie(env.REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

      return reply.send({ access_token: tokens.accessToken, token_type: "bearer" as const });
    },
  );

  app.post(
    "/refresh",
    { schema: { response: { 200: tokenResponseSchema } } },
    async (request, reply) => {
      const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME];

      if (!refreshToken) {
        throw new UnauthorizedError("Missing refresh token");
      }

      const tokens = await rotateRefreshToken(refreshToken);

      reply.setCookie(env.REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

      return reply.send({ access_token: tokens.accessToken, token_type: "bearer" as const });
    },
  );

  app.post("/logout", async (request, reply) => {
    const refreshToken = request.cookies[env.REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    reply.clearCookie(env.REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });

    return reply.send({ message: "Logged out" });
  });
}
