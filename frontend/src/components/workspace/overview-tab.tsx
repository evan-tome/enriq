import { ArrowRight, Bug, CheckCircle2, Circle, Inbox, Webhook } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getErrorMessage } from "@/lib/api"
import { listIssues } from "@/lib/api-issues"
import { listTriageItems } from "@/lib/api-triage-items"
import { listWebhookSources } from "@/lib/api-webhook-sources"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface OverviewTabProps {
  workspaceId: string
  onNavigate: (tab: string) => void
}

interface Stats {
  sourceCount: number
  activeSourceCount: number
  newSourcesThisWeek: number
  itemCount: number
  pendingCount: number
  reviewedCount: number
  newItemsThisWeek: number
  issueCount: number
  draftCount: number
  pushedCount: number
  newIssuesThisWeek: number
}

const STEPS = [
  {
    icon: Webhook,
    title: "1. Connect a source",
    description:
      "Create a webhook source to get an API key and ingest URL. Point any tool at it to send events into this workspace.",
  },
  {
    icon: Inbox,
    title: "2. Review your inbox",
    description:
      "Incoming events land in the inbox as Pending. Open one to see the details, then approve it to keep it or reject it to discard it.",
  },
  {
    icon: Bug,
    title: "3. Create an issue",
    description:
      "On the Issues tab, create an issue for the work, optionally linking it back to the inbox item, and set its priority and complexity.",
  },
  {
    icon: CheckCircle2,
    title: "4. Track it to done",
    description: "Update status as work progresses, and mark an issue Pushed once it has been created in Jira.",
  },
] as const

interface StatBreakdownSegment {
  label: string
  value: number
  className: string
}

interface StatCardProps {
  icon: typeof Webhook
  label: string
  value: string | number
  trend?: string
  breakdown?: StatBreakdownSegment[]
  onClick: () => void
}

function StatCard({ icon: Icon, label, value, trend, breakdown, onClick }: StatCardProps) {
  const total = breakdown?.reduce((sum, segment) => sum + segment.value, 0) ?? 0

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick()
        }
      }}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <CardDescription>{label}</CardDescription>
        </div>
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
          {trend && <span className="text-xs font-medium text-muted-foreground">{trend}</span>}
        </div>
      </CardHeader>
      {total > 0 && (
        <CardContent className="flex flex-col gap-2">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            {breakdown!.map(
              (segment) =>
                segment.value > 0 && (
                  <div
                    key={segment.label}
                    className={cn("h-full", segment.className)}
                    style={{ width: `${(segment.value / total) * 100}%` }}
                  />
                ),
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {breakdown!.map((segment) => (
              <span key={segment.label} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", segment.className)} />
                {segment.value} {segment.label}
              </span>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function OverviewTab({ workspaceId, onNavigate }: OverviewTabProps) {
  const { accessToken } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      return
    }

    let cancelled = false

    Promise.all([
      listWebhookSources(accessToken, workspaceId),
      listTriageItems(accessToken, workspaceId),
      listIssues(accessToken, workspaceId),
    ])
      .then(([sources, items, issues]) => {
        if (cancelled) {
          return
        }
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const isNew = (createdAt: string) => new Date(createdAt).getTime() >= weekAgo

        setStats({
          sourceCount: sources.length,
          activeSourceCount: sources.filter((source) => source.payloadCount > 0).length,
          newSourcesThisWeek: sources.filter((source) => isNew(source.createdAt)).length,
          itemCount: items.length,
          pendingCount: items.filter((item) => item.status === "PENDING").length,
          reviewedCount: items.filter((item) => item.status !== "PENDING").length,
          newItemsThisWeek: items.filter((item) => isNew(item.createdAt)).length,
          issueCount: issues.length,
          draftCount: issues.filter((issue) => issue.status === "DRAFT").length,
          pushedCount: issues.filter((issue) => issue.status === "PUSHED").length,
          newIssuesThisWeek: issues.filter((issue) => isNew(issue.createdAt)).length,
        })
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err))
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, workspaceId])

  const checklist = [
    {
      label: "Add a webhook source",
      done: (stats?.sourceCount ?? 0) > 0,
      tab: "webhook-sources",
      cta: "Webhook Sources",
    },
    {
      label: "Receive your first event",
      done: (stats?.itemCount ?? 0) > 0,
      tab: "webhook-sources",
      cta: "Webhook Sources",
    },
    {
      label: "Review an item in your inbox",
      done: (stats?.reviewedCount ?? 0) > 0,
      tab: "inbox",
      cta: "Inbox",
    },
    {
      label: "Create your first issue",
      done: (stats?.issueCount ?? 0) > 0,
      tab: "issues",
      cta: "Issues",
    },
  ]

  const completedSteps = checklist.filter((step) => step.done).length

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">At a glance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Webhook}
            label="Webhook sources"
            value={stats ? stats.sourceCount : "..."}
            trend={stats && stats.newSourcesThisWeek > 0 ? `+${stats.newSourcesThisWeek} this week` : undefined}
            breakdown={
              stats
                ? [
                    { label: "active", value: stats.activeSourceCount, className: "bg-primary" },
                    { label: "no data yet", value: stats.sourceCount - stats.activeSourceCount, className: "bg-muted-foreground/30" },
                  ]
                : undefined
            }
            onClick={() => onNavigate("webhook-sources")}
          />
          <StatCard
            icon={Inbox}
            label="Inbox"
            value={stats ? stats.itemCount : "..."}
            trend={stats && stats.newItemsThisWeek > 0 ? `+${stats.newItemsThisWeek} this week` : undefined}
            breakdown={
              stats
                ? [
                    { label: "reviewed", value: stats.reviewedCount, className: "bg-primary" },
                    { label: "pending", value: stats.pendingCount, className: "bg-muted-foreground/30" },
                  ]
                : undefined
            }
            onClick={() => onNavigate("inbox")}
          />
          <StatCard
            icon={Bug}
            label="Issues"
            value={stats ? stats.issueCount : "..."}
            trend={stats && stats.newIssuesThisWeek > 0 ? `+${stats.newIssuesThisWeek} this week` : undefined}
            breakdown={
              stats
                ? [
                    { label: "pushed", value: stats.pushedCount, className: "bg-primary" },
                    { label: "draft", value: stats.draftCount, className: "bg-muted-foreground/30" },
                  ]
                : undefined
            }
            onClick={() => onNavigate("issues")}
          />
          <StatCard
            icon={Circle}
            label="Draft issues"
            value={stats ? stats.draftCount : "..."}
            trend={stats && stats.draftCount > 0 ? "ready to push" : undefined}
            onClick={() => onNavigate("issues")}
          />
        </div>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">How Enriq works</h2>
          <p className="text-sm text-muted-foreground">
            Enriq helps you turn incoming events into tracked issues, in four steps.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <step.icon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{step.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Getting started</h2>
            <p className="text-sm text-muted-foreground">A quick checklist for setting up this workspace.</p>
          </div>
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {completedSteps} of {checklist.length} complete
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completedSteps / checklist.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-col gap-2">
          {checklist.map((step) => (
            <div key={step.label} className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="flex items-center gap-2">
                {step.done ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                <span className={cn("text-sm", step.done && "text-muted-foreground line-through")}>
                  {step.label}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate(step.tab)}>
                {step.cta}
                <ArrowRight />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
