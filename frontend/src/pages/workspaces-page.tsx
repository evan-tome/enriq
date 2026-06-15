import { Building2, Plus } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { getErrorMessage } from "@/lib/api"
import { createWorkspace, listWorkspaces, type Workspace } from "@/lib/api-workspaces"
import { useAuth } from "@/lib/auth-context"

export function WorkspacesPage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!accessToken) {
      return
    }

    listWorkspaces(accessToken)
      .then(setWorkspaces)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [accessToken])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setCreateError(null)
    setCreating(true)

    try {
      const workspace = await createWorkspace(accessToken, name)
      setOpen(false)
      setName("")
      navigate(`/workspaces/${workspace.id}/overview`)
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Each workspace connects your webhook sources, inbox, and issue tracker for one team or project.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus />
                New workspace
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New workspace</DialogTitle>
              <DialogDescription>
                You can connect webhook sources, Jira, GitHub, and Ollama from the workspace&apos;s settings
                after creating it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workspace-name">Name</Label>
                <Input
                  id="workspace-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
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

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && workspaces.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No workspaces yet</p>
            <p className="text-sm text-muted-foreground">
              Create a workspace to start connecting webhook sources and tracking issues.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && workspaces.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link key={workspace.id} to={`/workspaces/${workspace.id}/overview`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    {workspace.name}
                    <Badge variant={workspace.role === "OWNER" ? "default" : "secondary"}>{workspace.role}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{workspace.slug}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
