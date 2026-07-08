import { useEffect, useState, type FormEvent } from "react"

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
    if (!accessToken) return
    let cancelled = false
    listWorkspaceMembers(accessToken, workspaceId)
      .then((data) => { if (!cancelled) { setMembers(data); setError(null) } })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, workspaceId, refreshKey])

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    if (!accessToken) return
    setAddError(null)
    setAdding(true)
    try {
      await addWorkspaceMember(accessToken, workspaceId, email)
      setEmail("")
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setAddError(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!accessToken) return
    setError(null)
    setRemovingId(memberId)
    try {
      await removeWorkspaceMember(accessToken, workspaceId, memberId)
      setRefreshKey((k) => k + 1)
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
          Everyone with access to this workspace. Owners can manage settings - members can view and review items.
        </p>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-medium text-muted-foreground">Email</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Role</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Joined</th>
                {isOwner && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border">
                  <td className="py-2 pr-4">{member.email}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === "OWNER" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{new Date(member.createdAt).toLocaleDateString()}</td>
                  {isOwner && (
                    <td className="py-2">
                      {member.role !== "OWNER" && (
                        <button
                          type="button"
                          disabled={removingId === member.id}
                          onClick={() => void handleRemoveMember(member.id)}
                          className="px-2 py-1 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {removingId === member.id ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOwner && (
        <form onSubmit={handleAddMember} className="flex flex-col gap-1.5 max-w-sm mt-2">
          <label htmlFor="member-email" className="text-sm font-medium">Add member</label>
          <div className="flex gap-2">
            <input
              id="member-email"
              type="email"
              required
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" disabled={adding} className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">The user must already have an Enriq account.</p>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
        </form>
      )}
    </div>
  )
}
