import { useEffect, useState } from "react"
import { Link, Outlet, useNavigate, useParams } from "react-router-dom"

import { listWorkspaces, type Workspace } from "@/lib/api-workspaces"
import { useAuth } from "@/lib/auth-context"

export function AppLayout() {
  const { user, accessToken } = useAuth()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const initial = user?.email ? user.email[0].toUpperCase() : "?"

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  useEffect(() => {
    if (!accessToken) return
    listWorkspaces(accessToken).then(setWorkspaces).catch(() => {})
  }, [accessToken])

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
        <div className="flex h-14 items-center px-4 border-b border-border font-semibold">
          <Link to="/workspaces" className="flex items-center gap-2 hover:opacity-80">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">E</span>
            <span>Enriq</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          <p className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Workspaces</p>
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspaces/${ws.id}`}
              className={`block truncate rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted ${ws.id === workspaceId ? "bg-muted font-medium" : "text-muted-foreground"}`}
            >
              {ws.name}
            </Link>
          ))}
          {workspaces.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">No workspaces yet</p>
          )}
        </nav>

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-muted-foreground/20 text-xs font-medium text-foreground">
              {initial}
            </span>
            <span className="truncate">{user?.email}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
