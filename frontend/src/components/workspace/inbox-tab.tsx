import { useEffect, useState, type FormEvent } from "react"

import { getErrorMessage } from "@/lib/api"
import {
  listTriageItems,
  TRIAGE_STATUSES,
  updateTriageItem,
  type TriageItem,
  type TriageStatus,
} from "@/lib/api-triage-items"
import { useAuth } from "@/lib/auth-context"

interface InboxTabProps {
  workspaceId: string
}

const STATUS_COLORS: Record<TriageStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  APPROVED: "bg-primary/10 text-primary",
  REJECTED: "bg-destructive/10 text-destructive",
  ENRICHING: "bg-muted text-muted-foreground",
  ENRICHED: "bg-primary/10 text-primary",
}

function itemSummary(item: TriageItem): string {
  return item.title ?? item.description ?? JSON.stringify(item.rawPayload)
}

export function InboxTab({ workspaceId }: InboxTabProps) {
  const { accessToken } = useAuth()
  const [items, setItems] = useState<TriageItem[]>([])
  const [statusFilter, setStatusFilter] = useState<TriageStatus | "ALL">("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [viewingItem, setViewingItem] = useState<TriageItem | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editReporter, setEditReporter] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    listTriageItems(accessToken, workspaceId, statusFilter === "ALL" ? undefined : statusFilter)
      .then((data) => { if (!cancelled) { setItems(data); setError(null) } })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, workspaceId, statusFilter, refreshKey])

  useEffect(() => {
    const hasEnriching = items.some((item) => item.status === "APPROVED" || item.status === "ENRICHING")
    if (!hasEnriching) return
    const timeout = setTimeout(() => setRefreshKey((k) => k + 1), 5000)
    return () => clearTimeout(timeout)
  }, [items])

  async function handleDecision(id: string, status: "APPROVED" | "REJECTED") {
    if (!accessToken) return
    try {
      await updateTriageItem(accessToken, workspaceId, id, { status })
      setRefreshKey((k) => k + 1)
      setViewingItem(null)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function openViewDialog(item: TriageItem) {
    setViewingItem(item)
    setEditTitle(item.title ?? "")
    setEditDescription(item.description ?? "")
    setEditReporter(item.reporter ?? "")
    setEditError(null)
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault()
    if (!accessToken || !viewingItem) return
    setEditError(null)
    setSaving(true)
    try {
      await updateTriageItem(accessToken, workspaceId, viewingItem.id, {
        title: editTitle.trim() === "" ? null : editTitle,
        description: editDescription.trim() === "" ? null : editDescription,
        reporter: editReporter.trim() === "" ? null : editReporter,
      })
      setViewingItem(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Inbox</h2>
          <p className="text-sm text-muted-foreground">
            Review payloads sent from your webhook sources. Approve an item to keep it, or reject it to discard it.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TriageStatus | "ALL")}
          className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none"
        >
          <option value="ALL">All</option>
          {TRIAGE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Your inbox is empty</p>
          <p className="text-sm text-muted-foreground">Send a payload to a webhook source to see it appear here.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-medium text-muted-foreground">Item</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Reporter</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Created</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-2 pr-4 max-w-xs truncate">{itemSummary(item)}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{item.reporter ?? ""}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="py-2">
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => openViewDialog(item)} className="px-2 py-1 text-sm rounded-md border border-input hover:bg-muted">View</button>
                      {item.status === "PENDING" && (
                        <>
                          <button type="button" onClick={() => void handleDecision(item.id, "APPROVED")} className="px-2 py-1 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90">Approve</button>
                          <button type="button" onClick={() => void handleDecision(item.id, "REJECTED")} className="px-2 py-1 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewingItem(null)} />
          <div className="relative bg-card rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-1">Inbox item</h2>
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[viewingItem.status]}`}>{viewingItem.status}</span>
                <span className="text-sm text-muted-foreground">{new Date(viewingItem.createdAt).toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="triage-title" className="text-sm font-medium">Title</label>
                <input id="triage-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="triage-description" className="text-sm font-medium">Description</label>
                <textarea id="triage-description" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="triage-reporter" className="text-sm font-medium">Reporter</label>
                <input id="triage-reporter" value={editReporter} onChange={(e) => setEditReporter(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Raw payload</span>
                <pre className="max-h-48 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(viewingItem.rawPayload, null, 2)}
                </pre>
              </div>

              {editError && <p className="text-sm text-destructive">{editError}</p>}

              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  {viewingItem.status === "PENDING" && (
                    <>
                      <button type="button" onClick={() => void handleDecision(viewingItem.id, "APPROVED")} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90">Approve</button>
                      <button type="button" onClick={() => void handleDecision(viewingItem.id, "REJECTED")} className="px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90">Reject</button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setViewingItem(null)} className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted">Cancel</button>
                  <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
