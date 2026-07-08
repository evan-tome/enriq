import { useState, type FormEvent, type ReactNode } from "react"

import { getErrorMessage } from "@/lib/api"

interface AuthFormProps {
  title: string
  description: string
  submitLabel: string
  onSubmit: (email: string, password: string) => Promise<void>
  footer: ReactNode
}

export function AuthForm({ title, description, submitLabel, onSubmit, footer }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-10">
      <div className="flex items-center gap-2 font-semibold">
        <span className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white">
          E
        </span>
        <span className="text-lg">Enriq</span>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Please wait..." : submitLabel}
          </button>
        </form>

        <div className="mt-4 text-center">{footer}</div>
      </div>
    </div>
  )
}
