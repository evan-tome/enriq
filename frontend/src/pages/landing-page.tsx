import { Link, Navigate } from "react-router-dom"

import { useAuth } from "@/lib/auth-context"

export function LandingPage() {
  const { user, loading } = useAuth()

  if (!loading && user) return <Navigate to="/workspaces" replace />

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4">
      <div className="flex items-center gap-2 text-xl font-semibold">
        <span className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white">
          E
        </span>
        Enriq
      </div>
      <p className="max-w-sm text-center text-muted-foreground">
        Webhook-based bug report ingestion with AI enrichment and Jira integration.
      </p>
      <div className="flex gap-3">
        <Link to="/register" className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90">
          Sign up
        </Link>
        <Link to="/login" className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-muted">
          Log in
        </Link>
      </div>
    </div>
  )
}
