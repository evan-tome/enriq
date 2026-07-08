import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
} from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";

import { env } from "./env";
import authPlugin from "./plugins/auth";
import errorHandlerPlugin from "./plugins/errorHandler";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { issueRoutes } from "./routes/issues";
import { triageItemRoutes } from "./routes/triageItems";
import { userRoutes } from "./routes/users";
import { webhookIngestRoutes } from "./routes/webhookIngest";
import { webhookSourceRoutes } from "./routes/webhookSources";
import { workspaceRoutes } from "./routes/workspaces";

export type App = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

export function buildApp(): App {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(errorHandlerPlugin);
  app.register(authPlugin);

  app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  app.register(cookie);

  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(workspaceRoutes);
  app.register(webhookSourceRoutes);
  app.register(triageItemRoutes);
  app.register(webhookIngestRoutes);
  app.register(issueRoutes);

  return app;
}
