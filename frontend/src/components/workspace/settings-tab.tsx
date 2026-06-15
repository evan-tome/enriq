import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { InfoTooltip } from "@/components/info-tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getErrorMessage } from "@/lib/api"
import {
  deleteWorkspace,
  getEnrichmentStatus,
  getGithubStatus,
  getJiraStatus,
  getOllamaStatus,
  updateWorkspace,
  type EnrichmentStatus,
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

  const [enrichmentStatus, setEnrichmentStatus] = useState<EnrichmentStatus | null>(null)

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    getOllamaStatus(accessToken, workspace.id)
      .then((status) => {
        if (!cancelled) {
          setOllamaStatus(status)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOllamaStatus(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingOllama(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, workspace.id, ollamaRefreshKey])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    getJiraStatus(accessToken, workspace.id)
      .then((status) => {
        if (!cancelled) {
          setJiraStatus(status)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJiraStatus(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingJira(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, workspace.id, jiraRefreshKey])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    getGithubStatus(accessToken, workspace.id)
      .then((status) => {
        if (!cancelled) {
          setGithubStatus(status)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGithubStatus(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingGithub(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, workspace.id, githubRefreshKey])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    function poll() {
      getEnrichmentStatus(accessToken!, workspace.id)
        .then((status) => {
          if (!cancelled) {
            setEnrichmentStatus(status)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setEnrichmentStatus(null)
          }
        })
    }

    poll()
    const interval = setInterval(poll, 10_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [accessToken, workspace.id, ollamaRefreshKey])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

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
    if (!accessToken) {
      return
    }

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
    if (!accessToken) {
      return
    }

    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) {
      return
    }

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

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Connect the tools Enriq uses to enrich incoming inbox items and publish issues.
        </p>
        {readOnly && (
          <p className="text-sm text-muted-foreground">
            Only the workspace owner can change these settings.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-name">Name</Label>
          <Input
            id="settings-name"
            required
            disabled={readOnly}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">AI enrichment</h3>
          <p className="text-sm text-muted-foreground">
            Enriq sends approved inbox items to this Ollama instance to suggest a title, priority,
            complexity, and affected files for new issues.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-ollama-url">
            Ollama URL
            <InfoTooltip>The base URL of an Ollama server reachable by Enriq, e.g. http://localhost:11434</InfoTooltip>
          </Label>
          <Input
            id="settings-ollama-url"
            required
            disabled={readOnly}
            value={ollamaUrl}
            onChange={(event) => setOllamaUrl(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {checkingOllama ? (
            <Badge variant="outline">Checking...</Badge>
          ) : ollamaStatus?.reachable ? (
            ollamaStatus.modelAvailable ? (
              <Badge variant="secondary">
                <CheckCircle2 />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertTriangle />
                Reachable, but model not pulled
              </Badge>
            )
          ) : (
            <Badge variant="destructive">
              <XCircle />
              Not reachable
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={checkingOllama}
            onClick={() => {
              setCheckingOllama(true)
              setOllamaRefreshKey((key) => key + 1)
            }}
          >
            <RefreshCw />
            Check connection
          </Button>
        </div>

        {enrichmentStatus && (
          <div className="flex flex-col gap-1 rounded-md border p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Enrichment worker</span>
              <Badge variant={enrichmentStatus.worker.started ? "secondary" : "outline"}>
                {enrichmentStatus.worker.started ? "Running" : "Not running"}
              </Badge>
              {enrichmentStatus.worker.processing && <Badge variant="outline">Processing now</Badge>}
            </div>
            <p className="text-muted-foreground">
              {enrichmentStatus.queue.approved} queued · {enrichmentStatus.queue.enriching} in progress ·{" "}
              {enrichmentStatus.queue.enriched} enriched
            </p>
            {enrichmentStatus.worker.lastTickAt && (
              <p className="text-muted-foreground">
                Last checked: {new Date(enrichmentStatus.worker.lastTickAt).toLocaleString()} (
                {enrichmentStatus.worker.lastResult === "EMPTY"
                  ? "nothing to enrich"
                  : enrichmentStatus.worker.lastResult === "PROCESSED"
                    ? "processed an item"
                    : "failed"}
                )
              </p>
            )}
            {enrichmentStatus.worker.lastError && (
              <p className="text-destructive">
                Last error ({new Date(enrichmentStatus.worker.lastErrorAt!).toLocaleString()}):{" "}
                {enrichmentStatus.worker.lastError}
              </p>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Jira integration</h3>
          <p className="text-sm text-muted-foreground">
            Connect Jira so Enriq can look up related tickets and push enriched issues as new ones.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-jira-base-url">
            Jira base URL
            <InfoTooltip>Your Jira site URL, e.g. https://your-team.atlassian.net</InfoTooltip>
          </Label>
          <Input
            id="settings-jira-base-url"
            placeholder="https://your-team.atlassian.net"
            disabled={readOnly}
            value={jiraBaseUrl}
            onChange={(event) => setJiraBaseUrl(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-jira-email">
            Jira email
            <InfoTooltip>The email address associated with the Jira API token below.</InfoTooltip>
          </Label>
          <Input
            id="settings-jira-email"
            type="email"
            disabled={readOnly}
            value={jiraEmail}
            onChange={(event) => setJiraEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-jira-project-key">
            Jira project key
            <InfoTooltip>
              The project key new issues are created under, e.g. ENG. Find it in your Jira project settings.
            </InfoTooltip>
          </Label>
          <Input
            id="settings-jira-project-key"
            placeholder="ENG"
            disabled={readOnly}
            value={jiraProjectKey}
            onChange={(event) => setJiraProjectKey(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-jira-api-token">
            Jira API token
            <InfoTooltip>
              Generate one from your Atlassian account settings under Security &gt; API tokens. Used to
              authenticate with Jira&apos;s REST API.
            </InfoTooltip>
            {workspace.hasJiraApiToken && <span className="text-muted-foreground">(configured)</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              id="settings-jira-api-token"
              type="password"
              disabled={readOnly || workspace.hasJiraApiToken}
              value={workspace.hasJiraApiToken ? MASKED_TOKEN : jiraApiToken}
              onChange={(event) => setJiraApiToken(event.target.value)}
            />
            {!readOnly && workspace.hasJiraApiToken && (
              <Button type="button" variant="outline" onClick={() => void handleClearToken("jiraApiToken")}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {checkingJira ? (
            <Badge variant="outline">Checking...</Badge>
          ) : !jiraStatus?.configured ? (
            <Badge variant="outline">Not configured</Badge>
          ) : !jiraStatus.reachable ? (
            <Badge variant="destructive">
              <XCircle />
              Invalid credentials
            </Badge>
          ) : !jiraStatus.projectValid ? (
            <Badge variant="outline">
              <AlertTriangle />
              Connected, but project not found
            </Badge>
          ) : (
            <Badge variant="secondary">
              <CheckCircle2 />
              Connected
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={checkingJira}
            onClick={() => {
              setCheckingJira(true)
              setJiraRefreshKey((key) => key + 1)
            }}
          >
            <RefreshCw />
            Check connection
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">GitHub integration</h3>
          <p className="text-sm text-muted-foreground">
            Connect a repository so Enriq can reference your codebase when suggesting affected files.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-github-repo">
            GitHub repo
            <InfoTooltip>The repository Enriq should reference, in the form owner/repo, e.g. acme/web-app.</InfoTooltip>
          </Label>
          <Input
            id="settings-github-repo"
            placeholder="owner/repo"
            disabled={readOnly}
            value={githubRepo}
            onChange={(event) => setGithubRepo(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-github-token">
            GitHub token
            <InfoTooltip>A personal access token with read access to the repository above.</InfoTooltip>
            {workspace.hasGithubToken && <span className="text-muted-foreground">(configured)</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              id="settings-github-token"
              type="password"
              disabled={readOnly || workspace.hasGithubToken}
              value={workspace.hasGithubToken ? MASKED_TOKEN : githubToken}
              onChange={(event) => setGithubToken(event.target.value)}
            />
            {!readOnly && workspace.hasGithubToken && (
              <Button type="button" variant="outline" onClick={() => void handleClearToken("githubToken")}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {checkingGithub ? (
            <Badge variant="outline">Checking...</Badge>
          ) : !githubStatus?.configured ? (
            <Badge variant="outline">Not configured</Badge>
          ) : !githubStatus.reachable ? (
            <Badge variant="destructive">
              <XCircle />
              Invalid token
            </Badge>
          ) : !githubStatus.repoValid ? (
            <Badge variant="outline">
              <AlertTriangle />
              Connected, but repo not found
            </Badge>
          ) : (
            <Badge variant="secondary">
              <CheckCircle2 />
              Connected
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={checkingGithub}
            onClick={() => {
              setCheckingGithub(true)
              setGithubRefreshKey((key) => key + 1)
            }}
          >
            <RefreshCw />
            Check connection
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            Assignee mapping
            <InfoTooltip>
              When an issue&apos;s affected files have a recent GitHub committer, Enriq looks up their
              GitHub username here to suggest a Jira assignee. Add a row for each teammate.
            </InfoTooltip>
          </Label>
          <div className="flex flex-col gap-2">
            {assigneeMapping.map((row, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="GitHub username"
                  disabled={readOnly}
                  value={row.githubUsername}
                  onChange={(event) =>
                    setAssigneeMapping((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, githubUsername: event.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder="Jira display name"
                  disabled={readOnly}
                  value={row.jiraName}
                  onChange={(event) =>
                    setAssigneeMapping((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, jiraName: event.target.value } : r)),
                    )
                  }
                />
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAssigneeMapping((rows) => rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setAssigneeMapping((rows) => [...rows, { githubUsername: "", jiraName: "" }])}
            >
              <Plus />
              Add mapping
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-muted-foreground">Settings saved.</p>}

      {!readOnly && (
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Saving..." : "Save settings"}
        </Button>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/50 p-4">
          <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
          <p className="text-sm text-muted-foreground">
            Deleting a workspace removes all of its webhook sources, inbox items, and issues. This cannot
            be undone.
          </p>
          <Button type="button" variant="destructive" disabled={deleting} className="self-start" onClick={() => void handleDelete()}>
            {deleting ? "Deleting..." : "Delete workspace"}
          </Button>
        </div>
      )}
    </form>
  )
}
