import { z } from "zod";

import type { App } from "../app";
import { requireWorkspaceMember } from "../lib/workspaceAuth";
import {
  createWebhookSourceBodySchema,
  webhookSourceCreatedSchema,
  webhookSourceSchema,
} from "../schemas/webhookSource.schema";
import {
  createTestEvent,
  createWebhookSource,
  deleteWebhookSource,
  listWebhookSources,
} from "../services/webhookSourceService";

const workspaceParamsSchema = z.object({ workspaceId: z.string() });
const webhookSourceParamsSchema = z.object({ workspaceId: z.string(), id: z.string() });

export async function webhookSourceRoutes(app: App) {
  app.post(
    "/workspaces/:workspaceId/webhook-sources",
    {
      preHandler: [app.authenticate],
      schema: {
        params: workspaceParamsSchema,
        body: createWebhookSourceBodySchema,
        response: { 201: webhookSourceCreatedSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      const source = await createWebhookSource(workspaceId, request.body.name);

      return reply.status(201).send(source);
    },
  );

  app.get(
    "/workspaces/:workspaceId/webhook-sources",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema, response: { 200: z.array(webhookSourceSchema) } },
    },
    async (request) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return listWebhookSources(workspaceId);
    },
  );

  app.post(
    "/workspaces/:workspaceId/webhook-sources/:id/test-event",
    {
      preHandler: [app.authenticate],
      schema: { params: webhookSourceParamsSchema, response: { 200: z.object({ id: z.string() }) } },
    },
    async (request) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);
      return createTestEvent(workspaceId, id);
    },
  );

  app.delete(
    "/workspaces/:workspaceId/webhook-sources/:id",
    {
      preHandler: [app.authenticate],
      schema: { params: webhookSourceParamsSchema },
    },
    async (request, reply) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      await deleteWebhookSource(workspaceId, id);

      return reply.status(204).send();
    },
  );
}
