import { Settings2, Webhook } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { API_BASE_URL, getErrorMessage } from "@/lib/api"
import {
  createWebhookSource,
  deleteWebhookSource,
  listWebhookSources,
  sendTestCallback,
  sendTestEvent,
  updateWebhookSource,
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

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<WebhookSourceCreated | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [testingId, setTestingId] = useState<string | null>(null)
  const [testSentId, setTestSentId] = useState<string | null>(null)

  const [editingSource, setEditingSource] = useState<WebhookSource | null>(null)
  const [callbackUrl, setCallbackUrl] = useState("")
  const [callbackError, setCallbackError] = useState<string | null>(null)
  const [savingCallback, setSavingCallback] = useState(false)

  const [testingCallbackId, setTestingCallbackId] = useState<string | null>(null)
  const [testCallbackSentId, setTestCallbackSentId] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    listWebhookSources(accessToken, workspaceId)
      .then((data) => {
        if (!cancelled) {
          setSources(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, workspaceId, refreshKey])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setCreateError(null)
    setCreating(true)

    try {
      const source = await createWebhookSource(accessToken, workspaceId, name)
      setCreated(source)
      setName("")
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleSendTestEvent(id: string) {
    if (!accessToken) {
      return
    }

    setTestingId(id)
    setTestSentId(null)

    try {
      await sendTestEvent(accessToken, workspaceId, id)
      setRefreshKey((key) => key + 1)
      setTestSentId(id)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setTestingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken || !window.confirm("Delete this webhook source? This cannot be undone.")) {
      return
    }

    try {
      await deleteWebhookSource(accessToken, workspaceId, id)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function openCallbackDialog(source: WebhookSource) {
    setEditingSource(source)
    setCallbackUrl(source.callbackUrl ?? "")
    setCallbackError(null)
  }

  async function handleSaveCallback(event: FormEvent) {
    event.preventDefault()
    if (!accessToken || !editingSource) {
      return
    }

    setCallbackError(null)
    setSavingCallback(true)

    try {
      await updateWebhookSource(accessToken, workspaceId, editingSource.id, {
        callbackUrl: callbackUrl.trim() === "" ? null : callbackUrl.trim(),
      })
      setEditingSource(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setCallbackError(getErrorMessage(err))
    } finally {
      setSavingCallback(false)
    }
  }

  async function handleSendTestCallback(id: string) {
    if (!accessToken) {
      return
    }

    setTestingCallbackId(id)
    setTestCallbackSentId(null)

    try {
      await sendTestCallback(accessToken, workspaceId, id)
      setTestCallbackSentId(id)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setTestingCallbackId(null)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setCreated(null)
      setCreateError(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Webhook Sources</h2>
          <p className="text-sm text-muted-foreground">
            Each source has its own API key. Send a POST request to the ingest URL with that key to create
            a new item in your inbox from any external tool.
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New source</Button>} />
          <DialogContent className="sm:max-w-lg">
            {created ? (
              <>
                <DialogHeader>
                  <DialogTitle>Webhook source created</DialogTitle>
                  <DialogDescription>
                    Use the API key and ingest URL below to send events from your tool into this workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    Save this API key now — it won&apos;t be shown again.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label>API key</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={created.apiKey} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void navigator.clipboard.writeText(created.apiKey)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Ingest URL</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={`${API_BASE_URL}/webhooks/ingest`} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void navigator.clipboard.writeText(`${API_BASE_URL}/webhooks/ingest`)}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send a POST request with header{" "}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                        X-API-Key: {created.apiKey}
                      </code>
                      .
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Try it from a terminal</Label>
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all text-foreground">
                      {`curl -X POST ${API_BASE_URL}/webhooks/ingest \\\n  -H "X-API-Key: ${created.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title": "Login button unresponsive", "description": "Tapping the login button on mobile does nothing."}'`}
                    </pre>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void navigator.clipboard.writeText(
                          `curl -X POST ${API_BASE_URL}/webhooks/ingest \\\n  -H "X-API-Key: ${created.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title": "Login button unresponsive", "description": "Tapping the login button on mobile does nothing."}'`
                        )
                      }
                      className="self-start"
                    >
                      Copy command
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={() => handleOpenChange(false)}>
                    Done
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>New webhook source</DialogTitle>
                  <DialogDescription>
                    Give it a name to identify where events come from. You&apos;ll get an API key and ingest
                    URL after creating it.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="webhook-source-name">Name</Label>
                    <Input
                      id="webhook-source-name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  {createError && <p className="text-sm text-destructive">{createError}</p>}
                  <DialogFooter>
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && sources.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Webhook className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No webhook sources yet</p>
            <p className="text-sm text-muted-foreground">
              Create one to get an API key and start receiving events.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && sources.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Payloads received</TableHead>
              <TableHead>Last received</TableHead>
              <TableHead>Reward callback</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell>{source.name}</TableCell>
                <TableCell>{source.payloadCount}</TableCell>
                <TableCell>
                  {source.lastReceivedAt ? new Date(source.lastReceivedAt).toLocaleString() : "Never"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {source.callbackUrl ? (
                      <span className="max-w-[200px] truncate text-sm" title={source.callbackUrl}>
                        {source.callbackUrl}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not configured</span>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openCallbackDialog(source)}>
                      <Settings2 />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {testCallbackSentId === source.id && (
                      <span className="text-sm text-muted-foreground">Callback sent</span>
                    )}
                    {source.callbackUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={testingCallbackId === source.id}
                        onClick={() => void handleSendTestCallback(source.id)}
                      >
                        {testingCallbackId === source.id ? "Sending..." : "Send test callback"}
                      </Button>
                    )}
                    {testSentId === source.id && (
                      <span className="text-sm text-muted-foreground">Sent to inbox</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testingId === source.id}
                      onClick={() => void handleSendTestEvent(source.id)}
                    >
                      {testingId === source.id ? "Sending..." : "Send test event"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => void handleDelete(source.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editingSource !== null} onOpenChange={(nextOpen) => !nextOpen && setEditingSource(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reward callback</DialogTitle>
            <DialogDescription>
              When an inbox item from this source is approved, Enriq will POST to this URL so you can grant
              the reporter a reward (e.g. on your Minecraft server).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCallback} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="webhook-source-callback-url">Callback URL</Label>
              <Input
                id="webhook-source-callback-url"
                type="url"
                placeholder="https://your-server.example.com/enriq-reward"
                value={callbackUrl}
                onChange={(event) => setCallbackUrl(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Example payload</Label>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all text-foreground">
                {`{
  "event": "triage_item.approved",
  "triageItem": {
    "id": "...",
    "title": "...",
    "description": "...",
    "reporter": "PlayerName",
    "status": "APPROVED"
  }
}`}
              </pre>
            </div>
            {callbackError && <p className="text-sm text-destructive">{callbackError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingSource(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingCallback}>
                {savingCallback ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
