import { authHeaders, request } from "./api"

export const ISSUE_SOURCES = ["WEBHOOK", "JIRA_SYNC"] as const
export const ISSUE_COMPLEXITIES = ["LOW", "MEDIUM", "HIGH"] as const
export const ISSUE_STATUSES = ["DRAFT", "PUSHED"] as const

export type IssueSource = (typeof ISSUE_SOURCES)[number]
export type IssueComplexity = (typeof ISSUE_COMPLEXITIES)[number]
export type IssueStatus = (typeof ISSUE_STATUSES)[number]

export interface Issue {
  id: string
  workspaceId: string
  triageItemId: string | null
  source: IssueSource
  title: string
  description: string
  affectedFiles: string[]
  complexity: IssueComplexity | null
  priority: string | null
  reporter: string | null
  suggestedAssignee: string | null
  reasoning: string | null
  jiraKey: string | null
  status: IssueStatus
  createdAt: string
  updatedAt: string
}

export interface CreateIssueInput {
  title: string
  description: string
  triageItemId?: string | null
}

export interface UpdateIssueInput {
  title?: string
  description?: string
  affectedFiles?: string[]
  complexity?: IssueComplexity | null
  priority?: string | null
  reporter?: string | null
  suggestedAssignee?: string | null
  reasoning?: string | null
  jiraKey?: string | null
  status?: IssueStatus
}

export function listIssues(accessToken: string, workspaceId: string, status?: IssueStatus) {
  const query = status ? `?status=${status}` : ""
  return request<Issue[]>(`/workspaces/${workspaceId}/issues${query}`, {
    headers: authHeaders(accessToken),
  })
}

export function createIssue(accessToken: string, workspaceId: string, data: CreateIssueInput) {
  return request<Issue>(`/workspaces/${workspaceId}/issues`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  })
}

export function getIssue(accessToken: string, workspaceId: string, id: string) {
  return request<Issue>(`/workspaces/${workspaceId}/issues/${id}`, {
    headers: authHeaders(accessToken),
  })
}

export function updateIssue(accessToken: string, workspaceId: string, id: string, data: UpdateIssueInput) {
  return request<Issue>(`/workspaces/${workspaceId}/issues/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  })
}

export function deleteIssue(accessToken: string, workspaceId: string, id: string) {
  return request<void>(`/workspaces/${workspaceId}/issues/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
}

export function pushIssueToJira(accessToken: string, workspaceId: string, id: string) {
  return request<Issue>(`/workspaces/${workspaceId}/issues/${id}/push`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
}
