import { useEffect, useState } from "react"
import { Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom"

import { InboxTab } from "@/components/workspace/inbox-tab"
import { IssuesTab } from "@/components/workspace/issues-tab"
import { MembersTab } from "@/components/workspace/members-tab"
import { OverviewTab } from "@/components/workspace/overview-tab"
import { SettingsTab } from "@/components/workspace/settings-tab"
import { WebhookSourcesTab } from "@/components/workspace/webhook-sources-tab"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getErrorMessage } from "@/lib/api"
import { getWorkspace, type Workspace } from "@/lib/api-workspaces"

interface WorkspaceOutletContext {
  workspace: Workspace
  workspaceId: string
  onWorkspaceUpdated: (workspace: Workspace) => void
}

export function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { accessToken } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken || !workspaceId) {
      return
    }

    let cancelled = false

    getWorkspace(accessToken, workspaceId)
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data)
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
  }, [accessToken, workspaceId])

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (error || !workspace || !workspaceId) {
    return <p className="text-destructive">{error ?? "Workspace not found"}</p>
  }

  const context: WorkspaceOutletContext = { workspace, workspaceId, onWorkspaceUpdated: setWorkspace }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <Badge variant={workspace.role === "OWNER" ? "default" : "secondary"}>{workspace.role}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{workspace.slug}</p>
      </div>

      <Outlet context={context} />
    </div>
  )
}

export function OverviewRoute() {
  const { workspaceId } = useOutletContext<WorkspaceOutletContext>()
  const navigate = useNavigate()
  return <OverviewTab workspaceId={workspaceId} onNavigate={(tab) => navigate(`/workspaces/${workspaceId}/${tab}`)} />
}

export function SettingsRoute() {
  const { workspace, onWorkspaceUpdated } = useOutletContext<WorkspaceOutletContext>()
  return <SettingsTab workspace={workspace} onUpdated={onWorkspaceUpdated} />
}

export function WebhookSourcesRoute() {
  const { workspaceId } = useOutletContext<WorkspaceOutletContext>()
  return <WebhookSourcesTab workspaceId={workspaceId} />
}

export function InboxRoute() {
  const { workspaceId } = useOutletContext<WorkspaceOutletContext>()
  return <InboxTab workspaceId={workspaceId} />
}

export function IssuesRoute() {
  const { workspace, workspaceId } = useOutletContext<WorkspaceOutletContext>()
  const jiraConfigured = !!(workspace.jiraBaseUrl && workspace.jiraEmail && workspace.jiraProjectKey && workspace.hasJiraApiToken)
  return <IssuesTab workspaceId={workspaceId} jiraConfigured={jiraConfigured} jiraBaseUrl={workspace.jiraBaseUrl} />
}

export function MembersRoute() {
  const { workspace, workspaceId } = useOutletContext<WorkspaceOutletContext>()
  return <MembersTab workspace={workspace} workspaceId={workspaceId} />
}
