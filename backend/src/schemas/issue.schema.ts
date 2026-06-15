import { z } from "zod";

export const ISSUE_SOURCES = ["WEBHOOK", "JIRA_SYNC"] as const;
export const ISSUE_COMPLEXITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const ISSUE_STATUSES = ["DRAFT", "PUSHED"] as const;

export const issueSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  triageItemId: z.string().nullable(),
  source: z.enum(ISSUE_SOURCES),
  title: z.string(),
  description: z.string(),
  affectedFiles: z.array(z.string()),
  complexity: z.enum(ISSUE_COMPLEXITIES).nullable(),
  priority: z.string().nullable(),
  reporter: z.string().nullable(),
  suggestedAssignee: z.string().nullable(),
  reasoning: z.string().nullable(),
  jiraKey: z.string().nullable(),
  status: z.enum(ISSUE_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createIssueBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  triageItemId: z.string().uuid().nullable().optional(),
});

export const updateIssueBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  affectedFiles: z.array(z.string()).optional(),
  complexity: z.enum(ISSUE_COMPLEXITIES).nullable().optional(),
  priority: z.string().nullable().optional(),
  reporter: z.string().nullable().optional(),
  suggestedAssignee: z.string().nullable().optional(),
  reasoning: z.string().nullable().optional(),
  jiraKey: z.string().nullable().optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
});

export type IssueDto = z.infer<typeof issueSchema>;
export type CreateIssueBody = z.infer<typeof createIssueBodySchema>;
export type UpdateIssueBody = z.infer<typeof updateIssueBodySchema>;
