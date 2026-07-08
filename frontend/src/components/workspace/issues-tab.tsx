import { useEffect, useState, type FormEvent } from "react"

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

export function IssuesTab({ workspaceId, jiraConfigured, jiraBaseUrl }: IssuesTabProps) {
  const { accessToken } = useAuth()
  const [issues, setIssues] = useState<Issue[]>([])
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "ALL">("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pushingId, setPushingId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [triageItemId, setTriageItemId] = useState(NONE)
  const [approvedTriageItems, setApprovedTriageItems] = useState<TriageItem[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editAffectedFiles, setEditAffectedFiles] = useState("")
  const [editPriority, setEditPriority] = useState(NONE)
  const [editComplexity, setEditComplexity] = useState<IssueComplexity | typeof NONE>(NONE)
  const [editReporter, setEditReporter] = useState("")
  const [editSuggestedAssignee, setEditSuggestedAssignee] = useState("")
  const [editReasoning, setEditReasoning] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [jiraPriorities, setJiraPriorities] = useState<JiraPriority[]>([])

  useEffect(() => {
    if (!accessToken || !jiraConfigured) return
    let cancelled = false
    getJiraPriorities(accessToken, workspaceId)
      .then((p) => { if (!cancelled) setJiraPriorities(p) })
      .catch(() => { if (!cancelled) setJiraPriorities([]) })
    return () => { cancelled = true }
  }, [accessToken, workspaceId, jiraConfigured])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    listIssues(accessToken, workspaceId, statusFilter === "ALL" ? undefined : statusFilter)
      .then((data) => { if (!cancelled) { setIssues(data); setError(null) } })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, workspaceId, statusFilter, refreshKey])

  function openCreateDialog() {
    setTitle("")
    setDescription("")
    setTriageItemId(NONE)
    setCreateError(null)
    setCreateOpen(true)
    if (accessToken) {
      listTriageItems(accessToken, workspaceId, "APPROVED")
        .then(setApprovedTriageItems)
        .catch(() => setApprovedTriageItems([]))
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) return
    setCreateError(null)
    setCreating(true)
    try {
      await createIssue(accessToken, workspaceId, {
        title,
        description,
        triageItemId: triageItemId === NONE ? undefined : triageItemId,
      })
      setCreateOpen(false)
      setRefreshKey((k) => k + 1)
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
    if (!accessToken || !editingIssue) return
    setEditError(null)
    setSaving(true)
    try {
      const data: UpdateIssueInput = {
        title: editTitle,
        description: editDescription,
        affectedFiles: editAffectedFiles.split("\n").map((f) => f.trim()).filter((f) => f !== ""),
        priority: editPriority === NONE ? null : editPriority,
        complexity: editComplexity === NONE ? null : editComplexity,
        reporter: editReporter.trim() === "" ? null : editReporter,
        suggestedAssignee: editSuggestedAssignee.trim() === "" ? null : editSuggestedAssignee,
        reasoning: editReasoning.trim() === "" ? null : editReasoning,
      }
      await updateIssue(accessToken, workspaceId, editingIssue.id, data)
      setEditingIssue(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setEditError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return
    setDeleting(true)
    try {
      await deleteIssue(accessToken, workspaceId, id)
      setDeleteTarget(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  async function handlePushToJira(id: string) {
    if (!accessToken) return
    setError(null)
    setPushingId(id)
    try {
      await pushIssueToJira(accessToken, workspaceId, id)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPushingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Issues</h2>
          <p className="text-sm text-muted-foreground">
            Draft issues stay in Enriq; pushed issues have been synced to Jira.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IssueStatus | "ALL")}
            className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none"
          >
            <option value="ALL">All</option>
            {ISSUE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={openCreateDialog} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90">
            New issue
          </button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && issues.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">No issues yet</p>
          <p className="text-sm text-muted-foreground">Create one manually, optionally linking it to an approved inbox item.</p>
        </div>
      )}

      {!loading && !error && issues.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-medium text-muted-foreground">Title</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Reporter</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Priority</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Complexity</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Jira</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id} className="border-b border-border">
                  <td className="py-2 pr-4 max-w-xs truncate">{issue.title}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{issue.reporter ?? ""}</td>
                  <td className="py-2 pr-4">{issue.priority && <span className="text-xs px-2 py-0.5 rounded-full border border-border">{issue.priority}</span>}</td>
                  <td className="py-2 pr-4">{issue.complexity && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{issue.complexity}</span>}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${issue.status === "PUSHED" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {issue.jiraKey && jiraBaseUrl
                      ? <a href={`${jiraBaseUrl.replace(/\/$/, "")}/browse/${issue.jiraKey}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{issue.jiraKey}</a>
                      : issue.jiraKey ?? ""}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1.5">
                      {issue.status === "DRAFT" && jiraConfigured && (
                        <button type="button" disabled={pushingId === issue.id} onClick={() => void handlePushToJira(issue.id)} className="px-2 py-1 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                          {pushingId === issue.id ? "Pushing..." : "Push to Jira"}
                        </button>
                      )}
                      <button type="button" onClick={() => openEditDialog(issue)} className="px-2 py-1 text-sm rounded-md border border-input hover:bg-muted">Edit</button>
                      <button type="button" onClick={() => setDeleteTarget(issue)} className="px-2 py-1 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-card rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">New issue</h2>
            <p className="text-sm text-muted-foreground mb-4">Describe the work. You can refine details after creating it.</p>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="issue-title" className="text-sm font-medium">Title</label>
                <input id="issue-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="issue-description" className="text-sm font-medium">Description</label>
                <textarea id="issue-description" required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
              </div>
              {approvedTriageItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Linked inbox item (optional)</label>
                  <select value={triageItemId} onChange={(e) => setTriageItemId(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none">
                    <option value={NONE}>None</option>
                    {approvedTriageItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.title ?? item.id}</option>
                    ))}
                  </select>
                </div>
              )}
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted">Cancel</button>
                <button type="submit" disabled={creating} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingIssue(null)} />
          <div className="relative bg-card rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-1">Edit issue</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Created {new Date(editingIssue.createdAt).toLocaleString()}
            </p>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-title" className="text-sm font-medium">Title</label>
                <input id="edit-title" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-reporter" className="text-sm font-medium">Reporter</label>
                <input id="edit-reporter" value={editReporter} onChange={(e) => setEditReporter(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-description" className="text-sm font-medium">Description</label>
                <textarea id="edit-description" required rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-affected-files" className="text-sm font-medium">Affected files (one per line)</label>
                <textarea id="edit-affected-files" rows={3} value={editAffectedFiles} onChange={(e) => setEditAffectedFiles(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono" />
              </div>
              <hr className="border-border" />
              <p className="text-sm font-semibold">AI suggestions</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Priority</label>
                  {jiraPriorities.length > 0 ? (
                    <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none">
                      <option value={NONE}>None</option>
                      {jiraPriorities.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input value={editPriority === NONE ? "" : editPriority} onChange={(e) => setEditPriority(e.target.value === "" ? NONE : e.target.value)} placeholder="e.g. High" className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Complexity</label>
                  <select value={editComplexity} onChange={(e) => setEditComplexity(e.target.value as IssueComplexity | typeof NONE)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none">
                    <option value={NONE}>None</option>
                    {ISSUE_COMPLEXITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-assignee" className="text-sm font-medium">Suggested assignee</label>
                <input id="edit-assignee" value={editSuggestedAssignee} onChange={(e) => setEditSuggestedAssignee(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-reasoning" className="text-sm font-medium">Reasoning</label>
                <textarea id="edit-reasoning" rows={2} value={editReasoning} onChange={(e) => setEditReasoning(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y" />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingIssue(null)} className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted">Cancel</button>
                <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card rounded-lg shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">Delete issue</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete &quot;{deleteTarget.title}&quot;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted">Cancel</button>
              <button type="button" disabled={deleting} onClick={() => void handleDelete(deleteTarget.id)} className="px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90 disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
