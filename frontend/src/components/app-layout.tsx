import { Bug, Building2, Check, ChevronsUpDown, Inbox, LayoutDashboard, Settings, Users, Webhook } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { listWorkspaces, type Workspace } from "@/lib/api-workspaces"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const SECTION_ITEMS = [
  { label: "Overview", to: "overview", icon: LayoutDashboard },
  { label: "Settings", to: "settings", icon: Settings },
  { label: "Webhook Sources", to: "webhook-sources", icon: Webhook },
  { label: "Inbox", to: "inbox", icon: Inbox },
  { label: "Issues", to: "issues", icon: Bug },
  { label: "Members", to: "members", icon: Users },
] as const

export function AppLayout() {
  const { user, accessToken } = useAuth()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const initial = user?.email ? user.email[0].toUpperCase() : "?"

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    listWorkspaces(accessToken)
      .then((data) => {
        if (!cancelled) {
          setWorkspaces(data)
        }
      })
      .catch(() => {
        // The workspace switcher is non-critical; leave it empty on failure.
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, workspaceId])

  const currentWorkspace = workspaces.find((workspace) => workspace.id === workspaceId)

  function switchWorkspace(id: string) {
    const section = location.pathname.split("/")[3] ?? "overview"
    navigate(`/workspaces/${id}/${section}`)
  }

  return (
    <div className="flex min-h-svh bg-muted/30">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 px-4 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            E
          </span>
          <span>Enriq</span>
        </div>

        <div className="px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-sidebar-border px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="size-4 shrink-0" />
                    <span className="truncate">{currentWorkspace?.name ?? "Workspaces"}</span>
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
              }
            />
            <DropdownMenuContent align="start" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                {workspaces.length === 0 && (
                  <p className="px-1.5 py-1 text-sm text-muted-foreground">No workspaces yet</p>
                )}
                {workspaces.map((workspace) => (
                  <DropdownMenuItem key={workspace.id} onClick={() => switchWorkspace(workspace.id)}>
                    {workspace.id === workspaceId ? <Check /> : <span className="size-4" />}
                    <span className="truncate">{workspace.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/workspaces")}>
                <Building2 />
                All workspaces
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {workspaceId && (
          <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
            {SECTION_ITEMS.map((item) => {
              const to = `/workspaces/${workspaceId}/${item.to}`
              const isActive = location.pathname.startsWith(to)

              return (
                <Link
                  key={item.to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
      </aside>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center justify-end border-b bg-background px-6">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {initial}
          </button>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
