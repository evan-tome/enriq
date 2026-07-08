import { Prisma } from "@prisma/client";
import type { Issue, IssueStatus } from "@prisma/client";

import { BadRequestError, NotFoundError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { CreateIssueBody, IssueDto, UpdateIssueBody } from "../schemas/issue.schema";
import { createJiraIssue } from "./jiraService";

function toIssueDto(issue: Issue): IssueDto {
  return {
    id: issue.id,
    workspaceId: issue.workspaceId,
    triageItemId: issue.triageItemId,
    source: issue.source,
    title: issue.title,
    description: issue.description,
    affectedFiles: issue.affectedFiles as string[],
    complexity: issue.complexity,
    priority: issue.priority,
    reporter: issue.reporter,
    suggestedAssignee: issue.suggestedAssignee,
    reasoning: issue.reasoning,
    jiraKey: issue.jiraKey,
    status: issue.status,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export async function createIssue(workspaceId: string, data: CreateIssueBody): Promise<IssueDto> {
  let triageItem = null;
  if (data.triageItemId) {
    triageItem = await prisma.triageItem.findFirst({ where: { id: data.triageItemId, workspaceId } });
    if (!triageItem) throw new NotFoundError("Triage item not found");
  }

  const issue = await prisma.issue.create({
    data: {
      workspaceId,
      triageItemId: triageItem?.id ?? null,
      source: "WEBHOOK",
      title: data.title,
      description: data.description,
      reporter: triageItem?.reporter ?? null,
      affectedFiles: [] as Prisma.InputJsonValue,
    },
  });
  return toIssueDto(issue);
}

export async function listIssues(workspaceId: string, status?: IssueStatus): Promise<IssueDto[]> {
  const issues = await prisma.issue.findMany({
    where: { workspaceId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return issues.map(toIssueDto);
}

export async function getIssue(workspaceId: string, id: string): Promise<IssueDto> {
  const issue = await prisma.issue.findFirst({ where: { id, workspaceId } });
  if (!issue) throw new NotFoundError("Issue not found");
  return toIssueDto(issue);
}

export async function updateIssue(workspaceId: string, id: string, data: UpdateIssueBody): Promise<IssueDto> {
  const existing = await prisma.issue.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new NotFoundError("Issue not found");
  return toIssueDto(await prisma.issue.update({
    where: { id },
    data: { ...data, affectedFiles: data.affectedFiles as Prisma.InputJsonValue },
  }));
}

export async function deleteIssue(workspaceId: string, id: string): Promise<void> {
  await prisma.issue.deleteMany({ where: { id, workspaceId } });
}

export async function pushIssueToJira(workspaceId: string, id: string): Promise<IssueDto> {
  const issue = await prisma.issue.findFirst({ where: { id, workspaceId }, include: { workspace: true } });
  if (!issue) throw new NotFoundError("Issue not found");
  if (issue.status === "PUSHED") throw new BadRequestError("Issue has already been pushed to Jira");

  const { key } = await createJiraIssue(issue.workspace, issue);
  return toIssueDto(await prisma.issue.update({ where: { id }, data: { jiraKey: key, status: "PUSHED" } }));
}
