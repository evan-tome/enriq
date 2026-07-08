import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { getErrorMessage } from "@/lib/api"
import { createWorkspace } from "@/lib/api-workspaces"
import { useAuth } from "@/lib/auth-context"

export function WorkspacesPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleCreate(event: { preventDefault(): void }) {
    event.preventDefault()
    if (!accessToken) return
    setError(null)
    setCreating(true)
    try {
      const workspace = await createWorkspace(accessToken, name)
      navigate(`/workspaces/${workspace.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <div>
        <h1 className="text-xl font-semibold">Workspaces</h1>
        <p className="text-sm text-muted-foreground">Select a workspace from the sidebar, or create a new one below.</p>
      </div>
      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <label htmlFor="workspace-name" className="text-sm font-medium">New workspace</label>
        <div className="flex gap-2">
          <input
            id="workspace-name"
            required
            placeholder="My project"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  )
}
