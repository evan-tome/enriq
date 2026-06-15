import { Inbox } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

import { InfoTooltip } from "@/components/info-tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
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

const STATUS_VARIANTS: Record<TriageStatus, "secondary" | "default" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  ENRICHING: "outline",
  ENRICHED: "outline",
}

function itemSummary(item: TriageItem): string {
  if (item.title) {
    return item.title
  }
  if (item.description) {
    return item.description
  }
  return JSON.stringify(item.rawPayload)
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
    if (!accessToken) {
      return
    }

    let cancelled = false

    listTriageItems(accessToken, workspaceId, statusFilter === "ALL" ? undefined : statusFilter)
      .then((data) => {
        if (!cancelled) {
          setItems(data)
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
  }, [accessToken, workspaceId, statusFilter, refreshKey])

  useEffect(() => {
    const hasEnriching = items.some(
      (item) => item.status === "APPROVED" || item.status === "ENRICHING"
    )

    if (!hasEnriching) {
      return
    }

    const timeout = setTimeout(() => setRefreshKey((key) => key + 1), 5000)

    return () => clearTimeout(timeout)
  }, [items])

  async function handleDecision(id: string, status: "APPROVED" | "REJECTED") {
    if (!accessToken) {
      return
    }

    try {
      await updateTriageItem(accessToken, workspaceId, id, { status })
      setRefreshKey((key) => key + 1)
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
    if (!accessToken || !viewingItem) {
      return
    }

    setEditError(null)
    setSaving(true)

    try {
      await updateTriageItem(accessToken, workspaceId, viewingItem.id, {
        title: editTitle.trim() === "" ? null : editTitle,
        description: editDescription.trim() === "" ? null : editDescription,
        reporter: editReporter.trim() === "" ? null : editReporter,
      })
      setViewingItem(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Inbox</h2>
          <p className="text-sm text-muted-foreground">
            Review payloads sent in from your webhook sources. Approve an item to keep it for follow-up, or
            reject it to discard it. Approving doesn&apos;t create an issue automatically — do that from the
            Issues tab when you&apos;re ready.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TriageStatus | "ALL")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {TRIAGE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Your inbox is empty</p>
            <p className="text-sm text-muted-foreground">
              Send a payload to a webhook source&apos;s ingest URL to see it appear here.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  Status
                  <InfoTooltip>
                    New items start as Pending. Approve to mark one worth acting on, or reject to discard it.
                    Enriching and Enriched are reserved for upcoming AI-assisted suggestions.
                  </InfoTooltip>
                </span>
              </TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-md truncate">{itemSummary(item)}</TableCell>
                <TableCell className="text-muted-foreground">{item.reporter ?? ""}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[item.status]}>{item.status}</Badge>
                </TableCell>
                <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openViewDialog(item)}>
                      View
                    </Button>
                    {item.status === "PENDING" && (
                      <>
                        <Button size="sm" onClick={() => void handleDecision(item.id, "APPROVED")}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDecision(item.id, "REJECTED")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={viewingItem !== null} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inbox item</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <form onSubmit={handleSaveEdit} className="flex min-w-0 flex-col gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[viewingItem.status]}>{viewingItem.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(viewingItem.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="triage-title">Title</Label>
                <Input
                  id="triage-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="triage-description">Description</Label>
                <Textarea
                  id="triage-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="triage-reporter">Reporter</Label>
                <Input
                  id="triage-reporter"
                  value={editReporter}
                  onChange={(event) => setEditReporter(event.target.value)}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label>Raw payload</Label>
                <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(viewingItem.rawPayload, null, 2)}
                </pre>
              </div>

              {editError && <p className="text-sm text-destructive">{editError}</p>}

              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <div className="flex gap-2">
                  {viewingItem.status === "PENDING" && (
                    <>
                      <Button
                        type="button"
                        onClick={() => void handleDecision(viewingItem.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void handleDecision(viewingItem.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
