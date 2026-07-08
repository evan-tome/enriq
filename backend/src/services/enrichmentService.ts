import { Prisma } from "@prisma/client";
import type { IssueComplexity, TriageItem, Workspace } from "@prisma/client";

import { env } from "../env";
import { ISSUE_COMPLEXITIES } from "../schemas/issue.schema";
import { prisma } from "../lib/prisma";
import { getRecentCommitters, getRepoFilePaths } from "./githubService";
import { getJiraPriorities } from "./jiraService";

interface EnrichmentResult {
  title: string;
  description: string;
  priority: string | null;
  complexity: IssueComplexity;
  affectedFiles: string[];
  reasoning: string;
}

function buildPrompt(item: TriageItem, priorityNames: string[], filePaths: string[]): string {
  const priorityInstruction =
    priorityNames.length > 0
      ? `- "priority": the name of the Jira priority that best matches the urgency of this issue, chosen from exactly these options, listed from most urgent to least urgent: ${priorityNames.map((name) => `"${name}"`).join(", ")}. A minor or low-risk issue should get a priority near the end of this list.`
      : `- "priority": set to null (no priority scale is configured for this workspace)`;

  const affectedFilesInstruction =
    filePaths.length > 0
      ? `- "affectedFiles": an array of 0 to 5 file paths from the "Repository files" list at the end of this prompt that are most likely related to this issue, chosen ONLY from that list. Use an empty array if none seem relevant.`
      : `- "affectedFiles": set to an empty array (no repository is configured for this workspace)`;

  const repoFilesSection = filePaths.length > 0 ? `\n\nRepository files:\n${filePaths.join("\n")}` : "";

  return `You are a triage assistant for a software team. A user submitted the following bug report.

Title: ${item.title ?? "(none)"}
Description: ${item.description ?? "(none)"}

Raw payload:
${JSON.stringify(item.rawPayload, null, 2)}

Respond with a JSON object with exactly these fields:
- "title": a short, clear issue title (max 80 characters)
- "description": a clean, actionable description of the bug for a developer
${priorityInstruction}
- "complexity": one of "LOW", "MEDIUM", "HIGH"
- "reasoning": a brief explanation of the chosen priority and complexity, consistent with the values chosen above
${affectedFilesInstruction}

Respond with ONLY the JSON object and no other text.${repoFilesSection}`;
}

async function callOllama(
  ollamaUrl: string,
  prompt: string,
  priorityNames: string[],
  filePaths: string[],
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
  const filePathSet = new Set(filePaths);
  const affectedFiles = Array.isArray(parsed.affectedFiles)
    ? parsed.affectedFiles.filter((file): file is string => typeof file === "string" && filePathSet.has(file))
    : [];
  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

  return { title, description, priority, complexity, affectedFiles, reasoning };
}

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

  const filePaths = workspace.githubRepo ? await getRepoFilePaths(workspace).catch(() => []) : [];

  const result = await callOllama(workspace.ollamaUrl, buildPrompt(item, priorityNames, filePaths), priorityNames, filePaths);

  const suggestedAssignee = await suggestAssignee(workspace, result.affectedFiles);

  await prisma.$transaction([
    prisma.issue.create({
      data: {
        workspaceId: item.workspaceId,
        triageItemId: item.id,
        source: "WEBHOOK",
        title: result.title,
        description: result.description,
        affectedFiles: result.affectedFiles as Prisma.InputJsonValue,
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

/** Fetches the triage item and workspace, marks the item as ENRICHING, then enriches it. Fire-and-forget safe. */
export async function triggerEnrichment(workspaceId: string, itemId: string): Promise<void> {
  const [item, workspace] = await Promise.all([
    prisma.triageItem.findFirst({ where: { id: itemId, workspaceId } }),
    prisma.workspace.findFirst({ where: { id: workspaceId } }),
  ]);

  if (!item || !workspace) return;

  await prisma.triageItem.updateMany({ where: { id: item.id }, data: { status: "ENRICHING" } });

  try {
    await enrichTriageItem(item, workspace);
  } catch (error) {
    console.error(`Enrichment failed for triage item ${item.id}:`, error);
    await prisma.triageItem.updateMany({ where: { id: item.id }, data: { status: "APPROVED" } });
  }
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
