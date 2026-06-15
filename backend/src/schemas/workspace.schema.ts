import { z } from "zod";

export const createWorkspaceBodySchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateWorkspaceBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  jiraBaseUrl: z.string().nullable().optional(),
  jiraEmail: z.string().nullable().optional(),
  jiraApiToken: z.string().nullable().optional(),
  jiraProjectKey: z.string().nullable().optional(),
  githubRepo: z.string().nullable().optional(),
  githubToken: z.string().nullable().optional(),
  assigneeMapping: z.record(z.string(), z.string()).optional(),
  ollamaUrl: z.string().optional(),
});

export const workspaceRoleSchema = z.enum(["OWNER", "MEMBER"]);

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ownerId: z.string(),
  jiraBaseUrl: z.string().nullable(),
  jiraEmail: z.string().nullable(),
  jiraProjectKey: z.string().nullable(),
  hasJiraApiToken: z.boolean(),
  githubRepo: z.string().nullable(),
  hasGithubToken: z.boolean(),
  assigneeMapping: z.record(z.string(), z.string()),
  ollamaUrl: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  role: workspaceRoleSchema,
});

export const ollamaStatusSchema = z.object({
  reachable: z.boolean(),
  modelAvailable: z.boolean(),
});

export const jiraStatusSchema = z.object({
  configured: z.boolean(),
  reachable: z.boolean(),
  projectValid: z.boolean(),
});

export const githubStatusSchema = z.object({
  configured: z.boolean(),
  reachable: z.boolean(),
  repoValid: z.boolean(),
});

export const jiraPrioritySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const enrichmentStatusSchema = z.object({
  worker: z.object({
    started: z.boolean(),
    processing: z.boolean(),
    lastTickAt: z.string().nullable(),
    lastResult: z.enum(["EMPTY", "PROCESSED", "FAILED"]).nullable(),
    lastError: z.string().nullable(),
    lastErrorAt: z.string().nullable(),
  }),
  queue: z.object({
    approved: z.number(),
    enriching: z.number(),
    enriched: z.number(),
  }),
});

export const workspaceMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string(),
  role: workspaceRoleSchema,
  createdAt: z.string(),
});

export const addWorkspaceMemberBodySchema = z.object({
  email: z.string().email(),
});

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBodySchema>;
export type UpdateWorkspaceBody = z.infer<typeof updateWorkspaceBodySchema>;
export type WorkspaceDto = z.infer<typeof workspaceSchema>;
export type WorkspaceMemberDto = z.infer<typeof workspaceMemberSchema>;
export type AddWorkspaceMemberBody = z.infer<typeof addWorkspaceMemberBodySchema>;
export type OllamaStatusDto = z.infer<typeof ollamaStatusSchema>;
export type JiraStatusDto = z.infer<typeof jiraStatusSchema>;
export type GithubStatusDto = z.infer<typeof githubStatusSchema>;
export type JiraPriorityDto = z.infer<typeof jiraPrioritySchema>;
export type EnrichmentStatusDto = z.infer<typeof enrichmentStatusSchema>;
