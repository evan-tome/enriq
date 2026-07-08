import { useEffect, useState, type FormEvent } from "react"

import { API_BASE_URL, getErrorMessage } from "@/lib/api"
import {
  createWebhookSource,
  deleteWebhookSource,
  listWebhookSources,
  sendTestEvent,
  type WebhookSource,
  type WebhookSourceCreated,
} from "@/lib/api-webhook-sources"
import { useAuth } from "@/lib/auth-context"

interface WebhookSourcesTabProps {
  workspaceId: string
}

export function WebhookSourcesTab({ workspaceId }: WebhookSourcesTabProps) {
  const { accessToken } = useAuth()
  const [sources, setSources] = useState<WebhookSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [testingId, setTestingId] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<WebhookSourceCreated | null>(null)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    listWebhookSources(accessToken, workspaceId)
      .then((data) => { if (!cancelled) { setSources(data); setError(null) } })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, workspaceId, refreshKey])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) return
    setCreateError(null)
    setCreating(true)
    try {
      const source = await createWebhookSource(accessToken, workspaceId, name)
      setCreated(source)
      setName("")
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleSendTestEvent(id: string) {
    if (!accessToken) return
    setTestingId(id)
    try {
      await sendTestEvent(accessToken, workspaceId, id)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setTestingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken || !window.confirm("Delete this webhook source? This cannot be undone.")) return
    try {
      await deleteWebhookSource(accessToken, workspaceId, id)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function closeDialog() {
    setOpen(false)
    setCreated(null)
    setCreateError(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Webhook Sources</h2>
          <p className="text-sm text-muted-foreground">
            Each source has its own API key. POST to the ingest URL with that key to create inbox items.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          New source
        </button>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && sources.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No webhook sources yet</p>
          <p className="text-sm text-muted-foreground">Create one to get an API key and start receiving events.</p>
        </div>
      )}

      {!loading && !error && sources.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-medium text-muted-foreground">Name</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Payloads</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Last received</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-b border-border">
                  <td className="py-2 pr-4">{source.name}</td>
                  <td className="py-2 pr-4">{source.payloadCount}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {source.lastReceivedAt ? new Date(source.lastReceivedAt).toLocaleString() : "Never"}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={testingId === source.id}
                        onClick={() => void handleSendTestEvent(source.id)}
                        className="px-2 py-1 text-sm rounded-md border border-input hover:bg-muted disabled:opacity-50"
                      >
                        {testingId === source.id ? "Sending..." : "Send test"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(source.id)}
                        className="px-2 py-1 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeDialog} />
          <div className="relative bg-card rounded-lg shadow-lg w-full max-w-lg p-6">
            {created ? (
              <>
                <h2 className="text-lg font-semibold mb-1">Webhook source created</h2>
                <p className="text-sm text-muted-foreground mb-4">Save this API key — it won't be shown again.</p>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">API key</label>
                    <div className="flex gap-2">
                      <input readOnly value={created.apiKey} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-muted font-mono" />
                      <button type="button" onClick={() => void navigator.clipboard.writeText(created.apiKey)} className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted whitespace-nowrap">
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Ingest URL</label>
                    <div className="flex gap-2">
                      <input readOnly value={`${API_BASE_URL}/webhooks/ingest`} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-muted font-mono" />
                      <button type="button" onClick={() => void navigator.clipboard.writeText(`${API_BASE_URL}/webhooks/ingest`)} className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted whitespace-nowrap">
                        Copy
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send a POST request with header <code className="bg-muted px-1 rounded text-xs">X-API-Key: {created.apiKey}</code>.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Try it from a terminal</label>
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all">
                      {`curl -X POST ${API_BASE_URL}/webhooks/ingest \\\n  -H "X-API-Key: ${created.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title": "Login button unresponsive", "description": "Tapping login does nothing."}'`}
                    </pre>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={closeDialog} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90">
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-1">New webhook source</h2>
                <p className="text-sm text-muted-foreground mb-4">Give it a name to identify where events come from.</p>
                <form onSubmit={handleCreate} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="webhook-source-name" className="text-sm font-medium">Name</label>
                    <input
                      id="webhook-source-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {createError && <p className="text-sm text-destructive">{createError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={closeDialog} className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted">Cancel</button>
                    <button type="submit" disabled={creating} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                      {creating ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
