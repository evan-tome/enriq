import { Bug } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

import { InfoTooltip } from "@/components/info-tooltip"
import { Badge } from "@/components/ui/badge"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api"
import {
  createIssue,
  deleteIssue,
  ISSUE_COMPLEXITIES,
  ISSUE_STATUSES,
  listIssues,
  pushIssueToJira,
  updateIssue,
  type Issue,
  type IssueComplexity,
  type IssueStatus,
  type UpdateIssueInput,
} from "@/lib/api-issues"
import { listTriageItems, type TriageItem } from "@/lib/api-triage-items"
import { getJiraPriorities, type JiraPriority } from "@/lib/api-workspaces"
import { useAuth } from "@/lib/auth-context"

interface IssuesTabProps {
  workspaceId: string
  jiraConfigured: boolean
  jiraBaseUrl: string | null
}

const NONE = "__none__"

const COMPLEXITY_VARIANTS: Record<IssueComplexity, "outline" | "secondary" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "destructive",
}

const STATUS_VARIANTS: Record<IssueStatus, "secondary" | "default"> = {
  DRAFT: "secondary",
  PUSHED: "default",
}

export function IssuesTab({ workspaceId, jiraConfigured, jiraBaseUrl }: IssuesTabProps) {
  const { accessToken } = useAuth()
  const [issues, setIssues] = useState<Issue[]>([])
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "ALL">("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pushingId, setPushingId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [triageItemId, setTriageItemId] = useState<string>(NONE)
  const [approvedTriageItems, setApprovedTriageItems] = useState<TriageItem[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editAffectedFiles, setEditAffectedFiles] = useState("")
  const [editPriority, setEditPriority] = useState<string>(NONE)
  const [editComplexity, setEditComplexity] = useState<IssueComplexity | typeof NONE>(NONE)
  const [editReporter, setEditReporter] = useState("")
  const [editSuggestedAssignee, setEditSuggestedAssignee] = useState("")
  const [editReasoning, setEditReasoning] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [jiraPriorities, setJiraPriorities] = useState<JiraPriority[]>([])

  useEffect(() => {
    if (!accessToken || !jiraConfigured) {
      return
    }

    let cancelled = false

    getJiraPriorities(accessToken, workspaceId)
      .then((priorities) => {
        if (!cancelled) {
          setJiraPriorities(priorities)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJiraPriorities([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, workspaceId, jiraConfigured])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    listIssues(accessToken, workspaceId, statusFilter === "ALL" ? undefined : statusFilter)
      .then((data) => {
        if (!cancelled) {
          setIssues(data)
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

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open)
    if (open && accessToken) {
      setTitle("")
      setDescription("")
      setTriageItemId(NONE)
      setCreateError(null)
      listTriageItems(accessToken, workspaceId, "APPROVED")
        .then(setApprovedTriageItems)
        .catch(() => setApprovedTriageItems([]))
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setCreateError(null)
    setCreating(true)

    try {
      await createIssue(accessToken, workspaceId, {
        title,
        description,
        triageItemId: triageItemId === NONE ? undefined : triageItemId,
      })
      setCreateOpen(false)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  function openEditDialog(issue: Issue) {
    setEditingIssue(issue)
    setEditTitle(issue.title)
    setEditDescription(issue.description)
    setEditAffectedFiles(issue.affectedFiles.join("\n"))
    setEditPriority(issue.priority ?? NONE)
    setEditComplexity(issue.complexity ?? NONE)
    setEditReporter(issue.reporter ?? "")
    setEditSuggestedAssignee(issue.suggestedAssignee ?? "")
    setEditReasoning(issue.reasoning ?? "")
    setEditError(null)
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault()
    if (!accessToken || !editingIssue) {
      return
    }

    setEditError(null)
    setSaving(true)

    try {
      const data: UpdateIssueInput = {
        title: editTitle,
        description: editDescription,
        affectedFiles: editAffectedFiles
          .split("\n")
          .map((file) => file.trim())
          .filter((file) => file !== ""),
        priority: editPriority === NONE ? null : editPriority,
        complexity: editComplexity === NONE ? null : editComplexity,
        reporter: editReporter.trim() === "" ? null : editReporter,
        suggestedAssignee: editSuggestedAssignee.trim() === "" ? null : editSuggestedAssignee,
        reasoning: editReasoning.trim() === "" ? null : editReasoning,
      }
      await updateIssue(accessToken, workspaceId, editingIssue.id, data)
      setEditingIssue(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) {
      return
    }

    setDeleting(true)

    try {
      await deleteIssue(accessToken, workspaceId, id)
      setDeleteTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  async function handlePushToJira(id: string) {
    if (!accessToken) {
      return
    }

    setError(null)
    setPushingId(id)

    try {
      await pushIssueToJira(accessToken, workspaceId, id)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPushingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Issues</h2>
          <p className="text-sm text-muted-foreground">
            Units of work for this workspace, created manually and optionally linked to an approved inbox
            item. Draft issues stay in Enriq; pushed issues have been synced to Jira.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as IssueStatus | "ALL")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {ISSUE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
            <DialogTrigger render={<Button>New issue</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New issue</DialogTitle>
                <DialogDescription>
                  Describe the work to be done. You can refine priority, complexity, and other details after
                  creating it.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issue-title">Title</Label>
                  <Input
                    id="issue-title"
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="issue-description">Description</Label>
                  <Textarea
                    id="issue-description"
                    required
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                {approvedTriageItems.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Linked inbox item (optional)</Label>
                    <Select value={triageItemId} onValueChange={(value) => setTriageItemId(value ?? NONE)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {approvedTriageItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title ?? item.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && issues.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Bug className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No issues yet</p>
            <p className="text-sm text-muted-foreground">
              Create one manually, optionally linking it to an inbox item you&apos;ve approved.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && issues.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  Complexity
                  <InfoTooltip>An estimate of how much effort this issue will take to resolve.</InfoTooltip>
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  Status
                  <InfoTooltip>Draft issues are local to Enriq. Pushed issues have been synced to Jira.</InfoTooltip>
                </span>
              </TableHead>
              <TableHead>Jira key</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="max-w-md truncate">{issue.title}</TableCell>
                <TableCell className="text-muted-foreground">{issue.reporter ?? ""}</TableCell>
                <TableCell>{issue.priority && <Badge variant="outline">{issue.priority}</Badge>}</TableCell>
                <TableCell>
                  {issue.complexity && (
                    <Badge variant={COMPLEXITY_VARIANTS[issue.complexity]}>{issue.complexity}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[issue.status]}>{issue.status}</Badge>
                </TableCell>
                <TableCell>
                  {issue.jiraKey && jiraBaseUrl ? (
                    <a
                      href={`${jiraBaseUrl.replace(/\/$/, "")}/browse/${issue.jiraKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {issue.jiraKey}
                    </a>
                  ) : (
                    issue.jiraKey ?? ""
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {issue.status === "DRAFT" && jiraConfigured && (
                      <Button
                        size="sm"
                        disabled={pushingId === issue.id}
                        onClick={() => void handlePushToJira(issue.id)}
                      >
                        {pushingId === issue.id ? "Pushing..." : "Push to Jira"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(issue)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(issue)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editingIssue !== null} onOpenChange={(open) => !open && setEditingIssue(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit issue</DialogTitle>
          </DialogHeader>
          {editingIssue && (
            <form onSubmit={handleEditSubmit} className="flex max-h-[75vh] flex-col gap-4">
              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">Issue details</h3>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(editingIssue.createdAt).toLocaleString()} · Updated{" "}
                    {new Date(editingIssue.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    required
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-reporter">Reporter</Label>
                  <Input
                    id="edit-reporter"
                    value={editReporter}
                    onChange={(event) => setEditReporter(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    required
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-affected-files">Affected files (one per line)</Label>
                  <Textarea
                    id="edit-affected-files"
                    value={editAffectedFiles}
                    onChange={(event) => setEditAffectedFiles(event.target.value)}
                  />
                </div>

                <Separator />

                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">AI suggestions</h3>
                  <p className="text-sm text-muted-foreground">
                    Suggested by the enrichment model. Adjust if needed before pushing to Jira.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Priority</Label>
                    {jiraPriorities.length > 0 ? (
                      <Select value={editPriority} onValueChange={(value) => setEditPriority(value ?? NONE)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {jiraPriorities.map((priority) => (
                            <SelectItem key={priority.id} value={priority.name}>
                              {priority.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editPriority === NONE ? "" : editPriority}
                        onChange={(event) => setEditPriority(event.target.value === "" ? NONE : event.target.value)}
                        placeholder="e.g. High"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Complexity</Label>
                    <Select
                      value={editComplexity}
                      onValueChange={(value) => setEditComplexity(value as IssueComplexity | typeof NONE)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {ISSUE_COMPLEXITIES.map((complexity) => (
                          <SelectItem key={complexity} value={complexity}>
                            {complexity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-suggested-assignee">Suggested assignee</Label>
                  <Input
                    id="edit-suggested-assignee"
                    value={editSuggestedAssignee}
                    onChange={(event) => setEditSuggestedAssignee(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-reasoning">Reasoning</Label>
                  <Textarea
                    id="edit-reasoning"
                    value={editReasoning}
                    onChange={(event) => setEditReasoning(event.target.value)}
                  />
                </div>

                <Separator />

                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">Jira sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Managed automatically by &quot;Push to Jira&quot; and not editable here.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[editingIssue.status]}>{editingIssue.status}</Badge>
                  {editingIssue.jiraKey ? (
                    jiraBaseUrl ? (
                      <a
                        href={`${jiraBaseUrl.replace(/\/$/, "")}/browse/${editingIssue.jiraKey}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {editingIssue.jiraKey}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">{editingIssue.jiraKey}</span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">Not pushed yet</span>
                  )}
                </div>
              </div>

              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete issue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => deleteTarget && void handleDelete(deleteTarget.id)}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
