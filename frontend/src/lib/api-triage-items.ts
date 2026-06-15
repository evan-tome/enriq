import { authHeaders, request } from "./api"

export const TRIAGE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "ENRICHING", "ENRICHED"] as const

export type TriageStatus = (typeof TRIAGE_STATUSES)[number]

export interface TriageItem {
  id: string
  workspaceId: string
  webhookSourceId: string | null
  rawPayload: unknown
  title: string | null
  description: string | null
  reporter: string | null
  status: TriageStatus
  createdAt: string
  updatedAt: string
}

export interface UpdateTriageItemInput {
  status?: TriageStatus
  title?: string | null
  description?: string | null
  reporter?: string | null
}

export function listTriageItems(accessToken: string, workspaceId: string, status?: TriageStatus) {
  const query = status ? `?status=${status}` : ""
  return request<TriageItem[]>(`/workspaces/${workspaceId}/triage-items${query}`, {
    headers: authHeaders(accessToken),
  })
}

export function getTriageItem(accessToken: string, workspaceId: string, id: string) {
  return request<TriageItem>(`/workspaces/${workspaceId}/triage-items/${id}`, {
    headers: authHeaders(accessToken),
  })
}

export function updateTriageItem(
  accessToken: string,
  workspaceId: string,
  id: string,
  data: UpdateTriageItemInput,
) {
  return request<TriageItem>(`/workspaces/${workspaceId}/triage-items/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  })
}
