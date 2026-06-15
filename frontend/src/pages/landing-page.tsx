import {
  ArrowRight,
  Bot,
  Building2,
  GitBranch,
  Inbox,
  Send,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react"
import { Link, Navigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

const STEPS = [
  {
    icon: Webhook,
    title: "Bug reports come in",
    description:
      "Connect any tool that can send a webhook — support inbox, error tracker, feedback form — to a workspace.",
  },
  {
    icon: Inbox,
    title: "They land in your inbox",
    description: "Every report shows up as a raw item you can quickly approve or reject.",
  },
  {
    icon: Sparkles,
    title: "AI enriches the approved ones",
    description:
      "A local model reads your codebase to find affected files, estimate complexity, and suggest priority and an assignee.",
  },
  {
    icon: Send,
    title: "Push a clean ticket to Jira",
    description: "Review the AI's draft and send a polished, ready-to-work issue to Jira in one click.",
  },
]

const FEATURES = [
  {
    icon: Building2,
    title: "Multiple workspaces",
    description: "Keep each team or project's webhook sources, inbox, and issues separate.",
  },
  {
    icon: Bot,
    title: "Local-first AI",
    description: "Runs on your own Ollama instance with CodeLlama, so your codebase and bug reports stay local.",
  },
  {
    icon: GitBranch,
    title: "Codebase-aware",
    description: "Connect your GitHub repo so the AI can ground its suggestions in your actual code.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    description: "Nothing reaches Jira without a human reviewing and approving it first.",
  },
]

export function LandingPage() {
  const { user, loading } = useAuth()

  if (!loading && user) {
    return <Navigate to="/workspaces" replace />
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
              E
            </span>
            <span>Enriq</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" render={<Link to="/login" />}>
              Log in
            </Button>
            <Button render={<Link to="/register" />}>Sign up</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white">
            E
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Turn messy bug reports into ready-to-work Jira tickets
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Enriq collects bug reports from anywhere, lets your team review and approve them, and uses AI that
            reads your actual codebase to write clean, prioritized issues — so you can push straight to Jira.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link to="/register" />}>
              Get started
              <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" render={<Link to="/login" />}>
              Log in
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-2 text-muted-foreground">From raw report to ready ticket in four steps.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <Card key={step.title} className="relative">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <step.icon className="size-4.5" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
                  </div>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Why teams use Enriq</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-4.5" />
                  </span>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <Card className="items-center bg-gradient-to-br from-indigo-500 to-violet-600 py-12 text-center text-white">
            <CardContent className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">Ready to clean up your bug pipeline?</h2>
              <p className="max-w-md text-white/80">
                Create a workspace, connect a webhook source, and see your first AI-enriched issue in minutes.
              </p>
              <Button size="lg" variant="secondary" render={<Link to="/register" />}>
                Create your workspace
                <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Enriq</span>
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              E
            </span>
            <span>Enriq</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
