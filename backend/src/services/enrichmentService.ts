import { Prisma } from "@prisma/client";
import type { IssueComplexity, TriageItem, Workspace } from "@prisma/client";

import { env } from "../env";
import { ISSUE_COMPLEXITIES } from "../schemas/issue.schema";
import { prisma } from "../lib/prisma";
import { TtlCache } from "../lib/ttlCache";
import { extractQuotedPhrases, getRecentCommitters, getRepoFilePaths, searchRepoForPhrases } from "./githubService";
import { getJiraPriorities, getRecentIssueTitles } from "./jiraService";

const RECENT_TITLES_CACHE_TTL_MS = 15 * 60 * 1000;
const recentTitlesCache = new TtlCache<string, string[]>(RECENT_TITLES_CACHE_TTL_MS);

interface EnrichmentResult {
  title: string;
  description: string;
  priority: string | null;
  complexity: IssueComplexity;
  affectedFiles: string[];
  reasoning: string;
}

function buildPrompt(
  item: TriageItem,
  priorityNames: string[],
  filePaths: string[],
  recentTitles: string[],
  matchedFiles: string[],
): string {
  const priorityInstruction =
    priorityNames.length > 0
      ? `- "priority": the name of the Jira priority that best matches the urgency of this issue, chosen from exactly these options, listed from most urgent to least urgent: ${priorityNames.map((name) => `"${name}"`).join(", ")}. A minor or low-risk issue should get a priority near the end of this list.`
      : `- "priority": set to null (no priority scale is configured for this workspace)`;

  const affectedFilesInstruction =
    filePaths.length > 0
      ? `- "affectedFiles": an array of 0 to 5 file paths from the "Repository files" list at the end of this prompt that are most likely related to this issue, chosen ONLY from that list.${matchedFiles.length > 0 ? ` The files listed under "Files containing text from this bug report" were found by searching the codebase for exact phrases from this issue and are very likely related - include them unless clearly irrelevant.` : ""} Use an empty array if none seem relevant.`
      : `- "affectedFiles": set to an empty array (no repository is configured for this workspace)`;

  const repoFilesSection = filePaths.length > 0 ? `\n\nRepository files:\n${filePaths.join("\n")}` : "";

  const matchedFilesSection =
    matchedFiles.length > 0
      ? `\n\nFiles containing text from this bug report (found by searching the codebase, very likely related):\n${matchedFiles.join("\n")}`
      : "";

  const titleInstruction =
    recentTitles.length > 0
      ? `- "title": a short, clear issue title (max 80 characters), matching the style and format conventions of the existing issue titles listed at the end of this prompt`
      : `- "title": a short, clear issue title (max 80 characters)`;

  const recentTitlesSection =
    recentTitles.length > 0
      ? `\n\nExisting issue titles in this project (for style and format reference only, do not copy):\n${recentTitles.map((title) => `- ${title}`).join("\n")}`
      : "";

  const hasReportText = item.title !== null || item.description !== null;

  const reportSection = hasReportText
    ? `Title: ${item.title ?? "(none)"}\nDescription: ${item.description ?? "(none)"}`
    : `No title or description field was found on the incoming payload. Here is the raw payload that was submitted:\n${JSON.stringify(item.rawPayload, null, 2)}`;

  return `You are a triage assistant for a software team. A user submitted the following bug report.

${reportSection}

Respond with a JSON object with exactly these fields:
${titleInstruction}
- "description": a clean, actionable description of the bug for a developer
${priorityInstruction}
- "complexity": one of "LOW", "MEDIUM", "HIGH"
- "reasoning": a brief explanation of the chosen priority and complexity, consistent with the values chosen above
${affectedFilesInstruction}

Respond with ONLY the JSON object and no other text.${matchedFilesSection}${repoFilesSection}${recentTitlesSection}`;
}

async function callOllama(
  ollamaUrl: string,
  prompt: string,
  priorityNames: string[],
  filePaths: string[],
  matchedFiles: string[],
): Promise<EnrichmentResult> {
  const response = await fetch(new URL("/api/generate", ollamaUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      prompt,
      format: "json",
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const body = (await response.json()) as { response: string };
  const parsed = JSON.parse(body.response) as Record<string, unknown>;

  const title = typeof parsed.title === "string" && parsed.title.trim() !== "" ? parsed.title : "Untitled issue";
  const description = typeof parsed.description === "string" ? parsed.description : "";
  const priority =
    typeof parsed.priority === "string"
      ? priorityNames.find((name) => name.toLowerCase() === parsed.priority?.toString().toLowerCase()) ?? null
      : null;
  const complexity = ISSUE_COMPLEXITIES.includes(parsed.complexity as IssueComplexity)
    ? (parsed.complexity as IssueComplexity)
    : "MEDIUM";
  const filePathSet = new Set([...filePaths, ...matchedFiles]);
  const affectedFiles = Array.isArray(parsed.affectedFiles)
    ? parsed.affectedFiles.filter((file): file is string => typeof file === "string" && filePathSet.has(file))
    : [];
  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

  return { title, description, priority, complexity, affectedFiles, reasoning };
}

/**
 * Suggests an assignee for an issue by finding the most frequent recent GitHub committer to its
 * affected files and mapping their GitHub username to a Jira display name via the workspace's
 * assignee mapping.
 */
async function suggestAssignee(workspace: Workspace, affectedFiles: string[]): Promise<string | null> {
  const assigneeMapping = workspace.assigneeMapping as Record<string, string>;

  if (affectedFiles.length === 0 || Object.keys(assigneeMapping).length === 0) {
    return null;
  }

  const committers = await getRecentCommitters(workspace, affectedFiles).catch(() => []);

  for (const login of committers) {
    if (assigneeMapping[login]) {
      return assigneeMapping[login];
    }
  }

  return null;
}

async function enrichTriageItem(item: TriageItem, workspace: Workspace): Promise<void> {
  const priorityNames =
    workspace.jiraBaseUrl && workspace.jiraEmail && workspace.jiraApiTokenEncrypted
      ? await getJiraPriorities(workspace)
          .then((priorities) => priorities.map((p) => p.name))
          .catch(() => [])
      : [];

  const recentTitles =
    workspace.jiraBaseUrl && workspace.jiraEmail && workspace.jiraApiTokenEncrypted && workspace.jiraProjectKey
      ? await recentTitlesCache.getOrSet(workspace.id, () => getRecentIssueTitles(workspace).catch(() => []))
      : [];

  const filePaths = workspace.githubRepo ? await getRepoFilePaths(workspace).catch(() => []) : [];

  const quotedPhrases = extractQuotedPhrases(`${item.title ?? ""}\n${item.description ?? ""}`);
  const matchedFiles = workspace.githubRepo
    ? await searchRepoForPhrases(workspace, quotedPhrases).catch(() => [])
    : [];

  const result = await callOllama(
    workspace.ollamaUrl,
    buildPrompt(item, priorityNames, filePaths, recentTitles, matchedFiles),
    priorityNames,
    filePaths,
    matchedFiles,
  );

  const affectedFiles = [...new Set([...matchedFiles, ...result.affectedFiles])].slice(0, 5);

  const suggestedAssignee = await suggestAssignee(workspace, affectedFiles);

  await prisma.$transaction([
    prisma.issue.create({
      data: {
        workspaceId: item.workspaceId,
        triageItemId: item.id,
        source: "WEBHOOK",
        title: result.title,
        description: result.description,
        affectedFiles: affectedFiles as Prisma.InputJsonValue,
        complexity: result.complexity,
        priority: result.priority,
        reporter: item.reporter,
        reasoning: result.reasoning,
        suggestedAssignee,
      },
    }),
    prisma.triageItem.update({ where: { id: item.id }, data: { status: "ENRICHED" } }),
  ]);
}

export interface OllamaStatus {
  reachable: boolean;
  modelAvailable: boolean;
}

/** Checks whether the given Ollama instance is reachable and has the configured model pulled. */
export async function checkOllamaStatus(ollamaUrl: string): Promise<OllamaStatus> {
  try {
    const response = await fetch(new URL("/api/tags", ollamaUrl), {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { reachable: false, modelAvailable: false };
    }

    const body = (await response.json()) as { models?: { name: string }[] };
    const modelAvailable = (body.models ?? []).some(
      (model) => model.name === env.OLLAMA_MODEL || model.name.startsWith(`${env.OLLAMA_MODEL}:`),
    );

    return { reachable: true, modelAvailable };
  } catch {
    return { reachable: false, modelAvailable: false };
  }
}

export type EnrichmentTickResult = "EMPTY" | "PROCESSED" | "FAILED";

/** Claims and processes the oldest APPROVED triage item, if any. */
export async function processNextApprovedItem(): Promise<EnrichmentTickResult> {
  const item = await prisma.triageItem.findFirst({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });

  if (!item) {
    return "EMPTY";
  }

  const claimed = await prisma.triageItem.updateMany({
    where: { id: item.id, status: "APPROVED" },
    data: { status: "ENRICHING" },
  });

  if (claimed.count === 0) {
    return "PROCESSED";
  }

  try {
    await enrichTriageItem(item, item.workspace);
    return "PROCESSED";
  } catch (error) {
    console.error(`Enrichment failed for triage item ${item.id}:`, error);
    await prisma.triageItem.update({ where: { id: item.id }, data: { status: "APPROVED" } });
    return "FAILED";
  }
}

export interface EnrichmentQueueCounts {
  approved: number;
  enriching: number;
  enriched: number;
}

/** Counts triage items in each enrichment-related status for a workspace. */
export async function getEnrichmentQueueCounts(workspaceId: string): Promise<EnrichmentQueueCounts> {
  const [approved, enriching, enriched] = await Promise.all([
    prisma.triageItem.count({ where: { workspaceId, status: "APPROVED" } }),
    prisma.triageItem.count({ where: { workspaceId, status: "ENRICHING" } }),
    prisma.triageItem.count({ where: { workspaceId, status: "ENRICHED" } }),
  ]);

  return { approved, enriching, enriched };
}
