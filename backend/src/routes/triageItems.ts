import { z } from "zod";

import type { App } from "../app";
import { requireWorkspaceMember } from "../lib/workspaceAuth";
import { TRIAGE_STATUSES, triageItemSchema, updateTriageItemBodySchema } from "../schemas/triageItem.schema";
import { getTriageItem, listTriageItems, updateTriageItem } from "../services/triageItemService";

const workspaceParamsSchema = z.object({ workspaceId: z.string() });
const triageItemParamsSchema = z.object({ workspaceId: z.string(), id: z.string() });
const listTriageItemsQuerySchema = z.object({ status: z.enum(TRIAGE_STATUSES).optional() });

export async function triageItemRoutes(app: App) {
  app.get(
    "/workspaces/:workspaceId/triage-items",
    {
      preHandler: [app.authenticate],
      schema: {
        params: workspaceParamsSchema,
        querystring: listTriageItemsQuerySchema,
        response: { 200: z.array(triageItemSchema) },
      },
    },
    async (request) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return listTriageItems(workspaceId, request.query.status);
    },
  );

  app.get(
    "/workspaces/:workspaceId/triage-items/:id",
    {
      preHandler: [app.authenticate],
      schema: { params: triageItemParamsSchema, response: { 200: triageItemSchema } },
    },
    async (request) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return getTriageItem(workspaceId, id);
    },
  );

  app.patch(
    "/workspaces/:workspaceId/triage-items/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: triageItemParamsSchema,
        body: updateTriageItemBodySchema,
        response: { 200: triageItemSchema },
      },
    },
    async (request) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return updateTriageItem(workspaceId, id, request.body);
    },
  );
}
