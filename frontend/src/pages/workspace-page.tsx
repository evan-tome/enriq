import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import { InboxTab } from "@/components/workspace/inbox-tab"
import { IssuesTab } from "@/components/workspace/issues-tab"
import { MembersTab } from "@/components/workspace/members-tab"
import { SettingsTab } from "@/components/workspace/settings-tab"
import { WebhookSourcesTab } from "@/components/workspace/webhook-sources-tab"
import { getErrorMessage } from "@/lib/api"
import { getWorkspace, type Workspace } from "@/lib/api-workspaces"
import { useAuth } from "@/lib/auth-context"

type Tab = "webhook-sources" | "inbox" | "issues" | "members" | "settings"

const TABS: { id: Tab; label: string }[] = [
  { id: "webhook-sources", label: "Webhook Sources" },
  { id: "inbox", label: "Inbox" },
  { id: "issues", label: "Issues" },
  { id: "members", label: "Members" },
  { id: "settings", label: "Settings" },
]

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { accessToken } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("webhook-sources")

  useEffect(() => {
    if (!accessToken || !workspaceId) return
    let cancelled = false
    setLoading(true)
    getWorkspace(accessToken, workspaceId)
      .then((data) => { if (!cancelled) { setWorkspace(data); setError(null) } })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, workspaceId])

  if (loading) return <p className="text-muted-foreground">Loading...</p>
  if (error || !workspace || !workspaceId) return <p className="text-destructive">{error ?? "Workspace not found"}</p>

  const jiraConfigured = !!(workspace.jiraBaseUrl && workspace.jiraEmail && workspace.jiraProjectKey && workspace.hasJiraApiToken)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{workspace.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full ${workspace.role === "OWNER" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {workspace.role}
        </span>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "webhook-sources" && <WebhookSourcesTab workspaceId={workspaceId} />}
        {tab === "inbox" && <InboxTab workspaceId={workspaceId} />}
        {tab === "issues" && <IssuesTab workspaceId={workspaceId} jiraConfigured={jiraConfigured} jiraBaseUrl={workspace.jiraBaseUrl} />}
        {tab === "members" && <MembersTab workspace={workspace} workspaceId={workspaceId} />}
        {tab === "settings" && <SettingsTab workspace={workspace} onUpdated={setWorkspace} />}
      </div>
    </div>
  )
}
