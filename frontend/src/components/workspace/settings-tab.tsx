import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { getErrorMessage } from "@/lib/api"
import {
  deleteWorkspace,
  getGithubStatus,
  getJiraStatus,
  getOllamaStatus,
  updateWorkspace,
  type GithubStatus,
  type JiraStatus,
  type OllamaStatus,
  type Workspace,
} from "@/lib/api-workspaces"
import { useAuth } from "@/lib/auth-context"

interface SettingsTabProps {
  workspace: Workspace
  onUpdated: (workspace: Workspace) => void
}

const MASKED_TOKEN = "•".repeat(24)

export function SettingsTab({ workspace, onUpdated }: SettingsTabProps) {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const readOnly = workspace.role !== "OWNER"

  const [name, setName] = useState(workspace.name)
  const [ollamaUrl, setOllamaUrl] = useState(workspace.ollamaUrl)
  const [jiraBaseUrl, setJiraBaseUrl] = useState(workspace.jiraBaseUrl ?? "")
  const [jiraEmail, setJiraEmail] = useState(workspace.jiraEmail ?? "")
  const [jiraProjectKey, setJiraProjectKey] = useState(workspace.jiraProjectKey ?? "")
  const [jiraApiToken, setJiraApiToken] = useState("")
  const [githubRepo, setGithubRepo] = useState(workspace.githubRepo ?? "")
  const [githubToken, setGithubToken] = useState("")
  const [assigneeMapping, setAssigneeMapping] = useState<{ githubUsername: string; jiraName: string }[]>(
    Object.entries(workspace.assigneeMapping).map(([githubUsername, jiraName]) => ({ githubUsername, jiraName })),
  )

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(true)
  const [ollamaRefreshKey, setOllamaRefreshKey] = useState(0)

  const [jiraStatus, setJiraStatus] = useState<JiraStatus | null>(null)
  const [checkingJira, setCheckingJira] = useState(true)
  const [jiraRefreshKey, setJiraRefreshKey] = useState(0)

  const [githubStatus, setGithubStatus] = useState<GithubStatus | null>(null)
  const [checkingGithub, setCheckingGithub] = useState(true)
  const [githubRefreshKey, setGithubRefreshKey] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    getOllamaStatus(accessToken, workspace.id)
      .then((s) => { if (!cancelled) setOllamaStatus(s) })
      .catch(() => { if (!cancelled) setOllamaStatus(null) })
      .finally(() => { if (!cancelled) setCheckingOllama(false) })
    return () => { cancelled = true }
  }, [accessToken, workspace.id, ollamaRefreshKey])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    getJiraStatus(accessToken, workspace.id)
      .then((s) => { if (!cancelled) setJiraStatus(s) })
      .catch(() => { if (!cancelled) setJiraStatus(null) })
      .finally(() => { if (!cancelled) setCheckingJira(false) })
    return () => { cancelled = true }
  }, [accessToken, workspace.id, jiraRefreshKey])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    getGithubStatus(accessToken, workspace.id)
      .then((s) => { if (!cancelled) setGithubStatus(s) })
      .catch(() => { if (!cancelled) setGithubStatus(null) })
      .finally(() => { if (!cancelled) setCheckingGithub(false) })
    return () => { cancelled = true }
  }, [accessToken, workspace.id, githubRefreshKey])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) return
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const updated = await updateWorkspace(accessToken, workspace.id, {
        name,
        ollamaUrl,
        jiraBaseUrl: jiraBaseUrl.trim() === "" ? null : jiraBaseUrl,
        jiraEmail: jiraEmail.trim() === "" ? null : jiraEmail,
        jiraProjectKey: jiraProjectKey.trim() === "" ? null : jiraProjectKey,
        githubRepo: githubRepo.trim() === "" ? null : githubRepo,
        assigneeMapping: Object.fromEntries(
          assigneeMapping
            .filter((row) => row.githubUsername.trim() !== "" && row.jiraName.trim() !== "")
            .map((row) => [row.githubUsername.trim(), row.jiraName.trim()]),
        ),
        ...(jiraApiToken.trim() !== "" ? { jiraApiToken } : {}),
        ...(githubToken.trim() !== "" ? { githubToken } : {}),
      })
      onUpdated(updated)
      setJiraApiToken("")
      setGithubToken("")
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleClearToken(field: "jiraApiToken" | "githubToken") {
    if (!accessToken) return
    setError(null)
    setSuccess(false)
    try {
      const updated = await updateWorkspace(accessToken, workspace.id, { [field]: null })
      onUpdated(updated)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!accessToken) return
    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return
    setError(null)
    setDeleting(true)
    try {
      await deleteWorkspace(accessToken, workspace.id)
      navigate("/workspaces")
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  function statusText(checking: boolean, ok: boolean | null, okLabel: string, failLabel: string) {
    if (checking) return "Checking..."
    if (ok === null) return "—"
    return ok ? okLabel : failLabel
  }

  const ollamaOk = ollamaStatus?.reachable && ollamaStatus?.modelAvailable

  const inputClass = "w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
  const btnOutline = "px-3 py-1.5 text-sm font-medium rounded-md border border-input hover:bg-muted disabled:opacity-50"
  const btnPrimary = "px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Connect the tools Enriq uses to enrich inbox items and publish issues.</p>
        {readOnly && <p className="text-sm text-muted-foreground">Only the workspace owner can change these settings.</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="settings-name" className="text-sm font-medium">Name</label>
        <input id="settings-name" required disabled={readOnly} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <hr className="border-border" />

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold">AI enrichment</h3>
          <p className="text-sm text-muted-foreground">Approved inbox items are sent to this Ollama instance for enrichment.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-ollama-url" className="text-sm font-medium">Ollama URL</label>
          <input id="settings-ollama-url" required disabled={readOnly} value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{statusText(checkingOllama, ollamaOk ?? null, "Connected", ollamaStatus?.reachable ? "Reachable, model not pulled" : "Not reachable")}</span>
          <button type="button" disabled={checkingOllama} onClick={() => { setCheckingOllama(true); setOllamaRefreshKey((k) => k + 1) }} className={btnOutline}>
            Check connection
          </button>
        </div>
      </div>

      <hr className="border-border" />

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold">Jira integration</h3>
          <p className="text-sm text-muted-foreground">Connect Jira so Enriq can push enriched issues as new tickets.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-jira-base-url" className="text-sm font-medium">Jira base URL</label>
          <input id="settings-jira-base-url" placeholder="https://your-team.atlassian.net" disabled={readOnly} value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-jira-email" className="text-sm font-medium">Jira email</label>
          <input id="settings-jira-email" type="email" disabled={readOnly} value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-jira-project-key" className="text-sm font-medium">Jira project key</label>
          <input id="settings-jira-project-key" placeholder="ENG" disabled={readOnly} value={jiraProjectKey} onChange={(e) => setJiraProjectKey(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-jira-api-token" className="text-sm font-medium">
            Jira API token {workspace.hasJiraApiToken && <span className="text-muted-foreground font-normal">(configured)</span>}
          </label>
          <div className="flex gap-2">
            <input id="settings-jira-api-token" type="password" disabled={readOnly || workspace.hasJiraApiToken} value={workspace.hasJiraApiToken ? MASKED_TOKEN : jiraApiToken} onChange={(e) => setJiraApiToken(e.target.value)} className={inputClass} />
            {!readOnly && workspace.hasJiraApiToken && (
              <button type="button" onClick={() => void handleClearToken("jiraApiToken")} className={btnOutline}>Clear</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {checkingJira ? "Checking..." : !jiraStatus?.configured ? "Not configured" : !jiraStatus.reachable ? "Invalid credentials" : !jiraStatus.projectValid ? "Connected, project not found" : "Connected"}
          </span>
          <button type="button" disabled={checkingJira} onClick={() => { setCheckingJira(true); setJiraRefreshKey((k) => k + 1) }} className={btnOutline}>
            Check connection
          </button>
        </div>
      </div>

      <hr className="border-border" />

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold">GitHub integration</h3>
          <p className="text-sm text-muted-foreground">Connect a repo so Enriq can reference your codebase when suggesting affected files.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-github-repo" className="text-sm font-medium">GitHub repo</label>
          <input id="settings-github-repo" placeholder="owner/repo" disabled={readOnly} value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-github-token" className="text-sm font-medium">
            GitHub token {workspace.hasGithubToken && <span className="text-muted-foreground font-normal">(configured)</span>}
          </label>
          <div className="flex gap-2">
            <input id="settings-github-token" type="password" disabled={readOnly || workspace.hasGithubToken} value={workspace.hasGithubToken ? MASKED_TOKEN : githubToken} onChange={(e) => setGithubToken(e.target.value)} className={inputClass} />
            {!readOnly && workspace.hasGithubToken && (
              <button type="button" onClick={() => void handleClearToken("githubToken")} className={btnOutline}>Clear</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {checkingGithub ? "Checking..." : !githubStatus?.configured ? "Not configured" : !githubStatus.reachable ? "Invalid token" : !githubStatus.repoValid ? "Connected, repo not found" : "Connected"}
          </span>
          <button type="button" disabled={checkingGithub} onClick={() => { setCheckingGithub(true); setGithubRefreshKey((k) => k + 1) }} className={btnOutline}>
            Check connection
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Assignee mapping</label>
          <p className="text-xs text-muted-foreground">Map GitHub usernames to Jira display names for assignee suggestions.</p>
          <div className="flex flex-col gap-2">
            {assigneeMapping.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  placeholder="GitHub username"
                  disabled={readOnly}
                  value={row.githubUsername}
                  onChange={(e) => setAssigneeMapping((rows) => rows.map((r, i) => i === index ? { ...r, githubUsername: e.target.value } : r))}
                  className={inputClass}
                />
                <input
                  placeholder="Jira display name"
                  disabled={readOnly}
                  value={row.jiraName}
                  onChange={(e) => setAssigneeMapping((rows) => rows.map((r, i) => i === index ? { ...r, jiraName: e.target.value } : r))}
                  className={inputClass}
                />
                {!readOnly && (
                  <button type="button" onClick={() => setAssigneeMapping((rows) => rows.filter((_, i) => i !== index))} className={btnOutline}>✕</button>
                )}
              </div>
            ))}
          </div>
          {!readOnly && (
            <button type="button" onClick={() => setAssigneeMapping((rows) => [...rows, { githubUsername: "", jiraName: "" }])} className={`${btnOutline} self-start mt-1`}>
              + Add mapping
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-muted-foreground">Settings saved.</p>}

      {!readOnly && (
        <button type="submit" disabled={saving} className={`${btnPrimary} self-start`}>
          {saving ? "Saving..." : "Save settings"}
        </button>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/50 p-4">
          <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
          <p className="text-sm text-muted-foreground">
            Deleting a workspace removes all webhook sources, inbox items, and issues. This cannot be undone.
          </p>
          <button type="button" disabled={deleting} onClick={() => void handleDelete()} className="px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90 disabled:opacity-50 self-start">
            {deleting ? "Deleting..." : "Delete workspace"}
          </button>
        </div>
      )}
    </form>
  )
}
