import { authHeaders, request } from "./api"

export interface WebhookSource {
  id: string
  workspaceId: string
  name: string
  callbackUrl: string | null
  lastReceivedAt: string | null
  payloadCount: number
  createdAt: string
}

export interface WebhookSourceCreated extends WebhookSource {
  apiKey: string
}

export function listWebhookSources(accessToken: string, workspaceId: string) {
  return request<WebhookSource[]>(`/workspaces/${workspaceId}/webhook-sources`, {
    headers: authHeaders(accessToken),
  })
}

export function createWebhookSource(accessToken: string, workspaceId: string, name: string) {
  return request<WebhookSourceCreated>(`/workspaces/${workspaceId}/webhook-sources`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name }),
  })
}

export function deleteWebhookSource(accessToken: string, workspaceId: string, id: string) {
  return request<void>(`/workspaces/${workspaceId}/webhook-sources/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
}

export function updateWebhookSource(
  accessToken: string,
  workspaceId: string,
  id: string,
  data: { callbackUrl: string | null },
) {
  return request<WebhookSource>(`/workspaces/${workspaceId}/webhook-sources/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  })
}

export function sendTestEvent(accessToken: string, workspaceId: string, id: string) {
  return request<{ id: string }>(`/workspaces/${workspaceId}/webhook-sources/${id}/test-event`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
}

export function sendTestCallback(accessToken: string, workspaceId: string, id: string) {
  return request<{ ok: boolean }>(`/workspaces/${workspaceId}/webhook-sources/${id}/test-callback`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
}
