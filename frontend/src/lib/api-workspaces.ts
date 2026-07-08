import { authHeaders, request } from "./api"

export type WorkspaceRole = "OWNER" | "MEMBER"

export interface Workspace {
  id: string
  name: string
  slug: string
  ownerId: string
  jiraBaseUrl: string | null
  jiraEmail: string | null
  jiraProjectKey: string | null
  hasJiraApiToken: boolean
  githubRepo: string | null
  hasGithubToken: boolean
  assigneeMapping: Record<string, string>
  ollamaUrl: string
  createdAt: string
  updatedAt: string
  role: WorkspaceRole
}

export interface WorkspaceMember {
  id: string
  userId: string
  email: string
  role: WorkspaceRole
  createdAt: string
}

export interface OllamaStatus {
  reachable: boolean
  modelAvailable: boolean
}

export interface JiraStatus {
  configured: boolean
  reachable: boolean
  projectValid: boolean
}

export interface GithubStatus {
  configured: boolean
  reachable: boolean
  repoValid: boolean
}

export interface JiraPriority {
  id: string
  name: string
}

export interface UpdateWorkspaceInput {
  name?: string
  jiraBaseUrl?: string | null
  jiraEmail?: string | null
  jiraApiToken?: string | null
  jiraProjectKey?: string | null
  githubRepo?: string | null
  githubToken?: string | null
  assigneeMapping?: Record<string, string>
  ollamaUrl?: string
}

export function listWorkspaces(accessToken: string) {
  return request<Workspace[]>("/workspaces", { headers: authHeaders(accessToken) })
}

export function createWorkspace(accessToken: string, name: string) {
  return request<Workspace>("/workspaces", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name }),
  })
}

export function getWorkspace(accessToken: string, workspaceId: string) {
  return request<Workspace>(`/workspaces/${workspaceId}`, { headers: authHeaders(accessToken) })
}

export function updateWorkspace(accessToken: string, workspaceId: string, data: UpdateWorkspaceInput) {
  return request<Workspace>(`/workspaces/${workspaceId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  })
}

export function deleteWorkspace(accessToken: string, workspaceId: string) {
  return request<void>(`/workspaces/${workspaceId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
}

export function listWorkspaceMembers(accessToken: string, workspaceId: string) {
  return request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, {
    headers: authHeaders(accessToken),
  })
}

export function addWorkspaceMember(accessToken: string, workspaceId: string, email: string) {
  return request<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ email }),
  })
}

export function removeWorkspaceMember(accessToken: string, workspaceId: string, memberId: string) {
  return request<void>(`/workspaces/${workspaceId}/members/${memberId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
}

export function getOllamaStatus(accessToken: string, workspaceId: string) {
  return request<OllamaStatus>(`/workspaces/${workspaceId}/ollama-status`, {
    headers: authHeaders(accessToken),
  })
}

export function getJiraStatus(accessToken: string, workspaceId: string) {
  return request<JiraStatus>(`/workspaces/${workspaceId}/jira-status`, {
    headers: authHeaders(accessToken),
  })
}

export function getGithubStatus(accessToken: string, workspaceId: string) {
  return request<GithubStatus>(`/workspaces/${workspaceId}/github-status`, {
    headers: authHeaders(accessToken),
  })
}

export function getJiraPriorities(accessToken: string, workspaceId: string) {
  return request<JiraPriority[]>(`/workspaces/${workspaceId}/jira-priorities`, {
    headers: authHeaders(accessToken),
  })
}
