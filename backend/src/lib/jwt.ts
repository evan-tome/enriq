import jwt from "jsonwebtoken";

import { env } from "../env";

export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "access" }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.ACCESS_TOKEN_EXPIRES_MINUTES * 60,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });

  if (typeof payload === "string" || payload.type !== "access" || typeof payload.sub !== "string") {
    throw new Error("Invalid access token payload");
  }

  return { sub: payload.sub, type: "access" };
}
