import { z } from "zod";

import type { App } from "../app";
import { requireWorkspaceMember } from "../lib/workspaceAuth";
import { createIssueBodySchema, ISSUE_STATUSES, issueSchema, updateIssueBodySchema } from "../schemas/issue.schema";
import { createIssue, deleteIssue, getIssue, listIssues, pushIssueToJira, updateIssue } from "../services/issueService";

const workspaceParamsSchema = z.object({ workspaceId: z.string() });
const issueParamsSchema = z.object({ workspaceId: z.string(), id: z.string() });
const listIssuesQuerySchema = z.object({ status: z.enum(ISSUE_STATUSES).optional() });

export async function issueRoutes(app: App) {
  app.post(
    "/workspaces/:workspaceId/issues",
    {
      preHandler: [app.authenticate],
      schema: {
        params: workspaceParamsSchema,
        body: createIssueBodySchema,
        response: { 201: issueSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      const issue = await createIssue(workspaceId, request.body);

      return reply.status(201).send(issue);
    },
  );

  app.get(
    "/workspaces/:workspaceId/issues",
    {
      preHandler: [app.authenticate],
      schema: {
        params: workspaceParamsSchema,
        querystring: listIssuesQuerySchema,
        response: { 200: z.array(issueSchema) },
      },
    },
    async (request) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return listIssues(workspaceId, request.query.status);
    },
  );

  app.get(
    "/workspaces/:workspaceId/issues/:id",
    {
      preHandler: [app.authenticate],
      schema: { params: issueParamsSchema, response: { 200: issueSchema } },
    },
    async (request) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return getIssue(workspaceId, id);
    },
  );

  app.patch(
    "/workspaces/:workspaceId/issues/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: issueParamsSchema,
        body: updateIssueBodySchema,
        response: { 200: issueSchema },
      },
    },
    async (request) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return updateIssue(workspaceId, id, request.body);
    },
  );

  app.post(
    "/workspaces/:workspaceId/issues/:id/push",
    {
      preHandler: [app.authenticate],
      schema: { params: issueParamsSchema, response: { 200: issueSchema } },
    },
    async (request) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return pushIssueToJira(workspaceId, id);
    },
  );

  app.delete(
    "/workspaces/:workspaceId/issues/:id",
    {
      preHandler: [app.authenticate],
      schema: { params: issueParamsSchema },
    },
    async (request, reply) => {
      const { workspaceId, id } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      await deleteIssue(workspaceId, id);

      return reply.status(204).send();
    },
  );
}
