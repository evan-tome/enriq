import { z } from "zod";

import type { App } from "../app";
import { UnauthorizedError } from "../lib/errors";
import { ingestPayload } from "../services/webhookSourceService";

const ingestBodySchema = z.record(z.string(), z.unknown());
const ingestResponseSchema = z.object({ id: z.string() });

export async function webhookIngestRoutes(app: App) {
  app.post(
    "/webhooks/ingest",
    {
      schema: { body: ingestBodySchema, response: { 201: ingestResponseSchema } },
    },
    async (request, reply) => {
      const apiKey = request.headers["x-api-key"];

      if (typeof apiKey !== "string" || apiKey.length === 0) {
        throw new UnauthorizedError("Missing X-API-Key header");
      }

      const result = await ingestPayload(apiKey, request.body);

      return reply.status(201).send(result);
    },
  );
}
