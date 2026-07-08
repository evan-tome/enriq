import { z } from "zod";

import type { App } from "../app";
import { BadRequestError, ForbiddenError } from "../lib/errors";
import { requireWorkspaceMember } from "../lib/workspaceAuth";
import {
  addWorkspaceMemberBodySchema,
  createWorkspaceBodySchema,
  githubStatusSchema,
  jiraPrioritySchema,
  jiraStatusSchema,
  ollamaStatusSchema,
  updateWorkspaceBodySchema,
  workspaceMemberSchema,
  workspaceSchema,
} from "../schemas/workspace.schema";
import { checkOllamaStatus } from "../services/enrichmentService";
import { checkGithubStatus } from "../services/githubService";
import { checkJiraStatus, getJiraPriorities } from "../services/jiraService";
import {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaceEntity,
  listWorkspaceMembers,
  listWorkspacesForUser,
  removeWorkspaceMember,
  updateWorkspace,
} from "../services/workspaceService";

const workspaceParamsSchema = z.object({ workspaceId: z.string() });
const workspaceMemberParamsSchema = z.object({ workspaceId: z.string(), memberId: z.string() });

function assertOwner(role: "OWNER" | "MEMBER") {
  if (role !== "OWNER") {
    throw new ForbiddenError("Only the workspace owner can update settings");
  }
}

export async function workspaceRoutes(app: App) {
  app.post(
    "/workspaces",
    {
      preHandler: [app.authenticate],
      schema: { body: createWorkspaceBodySchema, response: { 201: workspaceSchema } },
    },
    async (request, reply) => {
      const workspace = await createWorkspace(request.user!.id, request.body.name);

      return reply.status(201).send(workspace);
    },
  );

  app.get(
    "/workspaces",
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: z.array(workspaceSchema) } },
    },
    async (request) => {
      return listWorkspacesForUser(request.user!.id);
    },
  );

  app.get(
    "/workspaces/:workspaceId",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema, response: { 200: workspaceSchema } },
    },
    async (request) => {
      const { workspaceId } = request.params;
      const member = await requireWorkspaceMember(workspaceId, request.user!.id);

      return getWorkspace(workspaceId, member.role);
    },
  );

  app.patch(
    "/workspaces/:workspaceId",
    {
      preHandler: [app.authenticate],
      schema: {
        params: workspaceParamsSchema,
        body: updateWorkspaceBodySchema,
        response: { 200: workspaceSchema },
      },
    },
    async (request) => {
      const { workspaceId } = request.params;
      const member = await requireWorkspaceMember(workspaceId, request.user!.id);

      assertOwner(member.role);

      return updateWorkspace(workspaceId, member.role, request.body);
    },
  );

  app.delete(
    "/workspaces/:workspaceId",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema },
    },
    async (request, reply) => {
      const { workspaceId } = request.params;
      const member = await requireWorkspaceMember(workspaceId, request.user!.id);

      assertOwner(member.role);

      await deleteWorkspace(workspaceId);

      return reply.status(204).send();
    },
  );

  app.get(
    "/workspaces/:workspaceId/ollama-status",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema, response: { 200: ollamaStatusSchema } },
    },
    async (request) => {
      const { workspaceId } = request.params;
      const member = await requireWorkspaceMember(workspaceId, request.user!.id);
      const workspace = await getWorkspace(workspaceId, member.role);

      return checkOllamaStatus(workspace.ollamaUrl);
    },
  );

  app.get(
    "/workspaces/:workspaceId/jira-status",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema, response: { 200: jiraStatusSchema } },
    },
    async (request) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);
      const workspace = await getWorkspaceEntity(workspaceId);

      return checkJiraStatus(workspace);
    },
  );

  app.get(
    "/workspaces/:workspaceId/github-status",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema, response: { 200: githubStatusSchema } },
    },
    async (request) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);
      const workspace = await getWorkspaceEntity(workspaceId);

      return checkGithubStatus(workspace);
    },
  );

  app.get(
    "/workspaces/:workspaceId/jira-priorities",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema, response: { 200: z.array(jiraPrioritySchema) } },
    },
    async (request) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);
      const workspace = await getWorkspaceEntity(workspaceId);

      if (!workspace.jiraBaseUrl || !workspace.jiraEmail || !workspace.jiraApiTokenEncrypted) {
        throw new BadRequestError("Jira is not configured for this workspace. Set it up in Settings.");
      }

      return getJiraPriorities(workspace);
    },
  );

  app.get(
    "/workspaces/:workspaceId/members",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceParamsSchema, response: { 200: z.array(workspaceMemberSchema) } },
    },
    async (request) => {
      const { workspaceId } = request.params;
      await requireWorkspaceMember(workspaceId, request.user!.id);

      return listWorkspaceMembers(workspaceId);
    },
  );

  app.post(
    "/workspaces/:workspaceId/members",
    {
      preHandler: [app.authenticate],
      schema: {
        params: workspaceParamsSchema,
        body: addWorkspaceMemberBodySchema,
        response: { 201: workspaceMemberSchema },
      },
    },
    async (request, reply) => {
      const { workspaceId } = request.params;
      const member = await requireWorkspaceMember(workspaceId, request.user!.id);

      assertOwner(member.role);

      const created = await addWorkspaceMember(workspaceId, request.body.email);

      return reply.status(201).send(created);
    },
  );

  app.delete(
    "/workspaces/:workspaceId/members/:memberId",
    {
      preHandler: [app.authenticate],
      schema: { params: workspaceMemberParamsSchema },
    },
    async (request, reply) => {
      const { workspaceId, memberId } = request.params;
      const member = await requireWorkspaceMember(workspaceId, request.user!.id);

      assertOwner(member.role);

      await removeWorkspaceMember(workspaceId, memberId);

      return reply.status(204).send();
    },
  );
}
