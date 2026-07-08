import { useAuth } from "@/lib/auth-context"

export function ProfilePage() {
  const { user, logout } = useAuth()
  const initial = user?.email ? user.email[0].toUpperCase() : "?"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account information.</p>
      </div>

      <div className="max-w-xl rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-base font-medium">
            {initial}
          </span>
          <span className="font-medium">{user?.email}</span>
        </div>

        <hr className="border-border mb-4" />

        <div className="flex flex-col gap-3 text-sm mb-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-white hover:opacity-90"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
