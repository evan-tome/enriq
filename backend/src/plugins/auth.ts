import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { UnauthorizedError } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: { id: string; email: string; createdAt: Date };
  }
}

const BEARER_PREFIX = "Bearer ";

export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorate("authenticate", async (request: FastifyRequest) => {
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedError("Missing or invalid Authorization header");
    }

    const token = header.slice(BEARER_PREFIX.length);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError("Invalid or expired access token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    request.user = { id: user.id, email: user.email, createdAt: user.createdAt };
  });
});
