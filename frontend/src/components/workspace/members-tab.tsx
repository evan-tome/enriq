import { useEffect, useState, type FormEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api"
import {
  addWorkspaceMember,
  listWorkspaceMembers,
  removeWorkspaceMember,
  type Workspace,
  type WorkspaceMember,
} from "@/lib/api-workspaces"
import { useAuth } from "@/lib/auth-context"

interface MembersTabProps {
  workspace: Workspace
  workspaceId: string
}

export function MembersTab({ workspace, workspaceId }: MembersTabProps) {
  const { accessToken } = useAuth()
  const isOwner = workspace.role === "OWNER"
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [email, setEmail] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    listWorkspaceMembers(accessToken, workspaceId)
      .then((data) => {
        if (!cancelled) {
          setMembers(data)
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
  }, [accessToken, workspaceId, refreshKey])

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setAddError(null)
    setAdding(true)

    try {
      await addWorkspaceMember(accessToken, workspaceId, email)
      setEmail("")
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setAddError(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!accessToken) {
      return
    }

    setError(null)
    setRemovingId(memberId)

    try {
      await removeWorkspaceMember(accessToken, workspaceId, memberId)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-sm text-muted-foreground">
          Everyone with access to this workspace. Owners can manage settings and integrations; members can
          view and review incoming items.
        </p>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {isOwner && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>{member.role}</Badge>
                </TableCell>
                <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                {isOwner && (
                  <TableCell>
                    {member.role !== "OWNER" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removingId === member.id}
                        onClick={() => void handleRemoveMember(member.id)}
                      >
                        {removingId === member.id ? "Removing..." : "Remove"}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isOwner && (
        <form onSubmit={handleAddMember} className="flex flex-col gap-1.5 max-w-sm">
          <Label htmlFor="member-email">Add member</Label>
          <div className="flex gap-2">
            <Input
              id="member-email"
              type="email"
              required
              placeholder="teammate@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            The user must already have an Enriq account.
          </p>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
        </form>
      )}
    </div>
  )
}
