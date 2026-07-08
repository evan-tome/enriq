import { randomBytes } from "node:crypto";

import type { Workspace, WorkspaceRole } from "@prisma/client";

import { encryptValue } from "../lib/encryption";
import { ConflictError, NotFoundError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { UpdateWorkspaceBody, WorkspaceDto, WorkspaceMemberDto } from "../schemas/workspace.schema";

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base ? `${base}-${randomBytes(3).toString("hex")}` : randomBytes(3).toString("hex");
}

function toWorkspaceDto(workspace: Workspace, role: WorkspaceRole): WorkspaceDto {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    jiraBaseUrl: workspace.jiraBaseUrl,
    jiraEmail: workspace.jiraEmail,
    jiraProjectKey: workspace.jiraProjectKey,
    hasJiraApiToken: !!workspace.jiraApiTokenEncrypted,
    githubRepo: workspace.githubRepo,
    hasGithubToken: !!workspace.githubTokenEncrypted,
    assigneeMapping: workspace.assigneeMapping as Record<string, string>,
    ollamaUrl: workspace.ollamaUrl,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
    role,
  };
}

export async function createWorkspace(ownerId: string, name: string): Promise<WorkspaceDto> {
  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({ data: { name, slug: slugify(name), ownerId } });
    await tx.workspaceMember.create({ data: { workspaceId: created.id, userId: ownerId, role: "OWNER" } });
    return created;
  });
  return toWorkspaceDto(workspace, "OWNER");
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceDto[]> {
  const members = await prisma.workspaceMember.findMany({ where: { userId }, include: { workspace: true } });
  return members.map((m) => toWorkspaceDto(m.workspace, m.role));
}

export async function getWorkspace(workspaceId: string, role: WorkspaceRole): Promise<WorkspaceDto> {
  return toWorkspaceDto(await getWorkspaceEntity(workspaceId), role);
}

export async function getWorkspaceEntity(workspaceId: string): Promise<Workspace> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace;
}

export async function updateWorkspace(workspaceId: string, role: WorkspaceRole, data: UpdateWorkspaceBody): Promise<WorkspaceDto> {
  const { jiraApiToken, githubToken, ...rest } = data;
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...rest,
      ...(jiraApiToken !== undefined ? { jiraApiTokenEncrypted: jiraApiToken ? encryptValue(jiraApiToken) : null } : {}),
      ...(githubToken !== undefined ? { githubTokenEncrypted: githubToken ? encryptValue(githubToken) : null } : {}),
    },
  });
  return toWorkspaceDto(workspace, role);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await prisma.workspace.delete({ where: { id: workspaceId } });
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: true } });
  return members.map((m) => ({ id: m.id, userId: m.userId, email: m.user.email, role: m.role, createdAt: m.createdAt.toISOString() }));
}

export async function addWorkspaceMember(workspaceId: string, email: string): Promise<WorkspaceMemberDto> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new NotFoundError("No user found with that email");

  const existing = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: user.id } } });
  if (existing) throw new ConflictError("This user is already a member of the workspace");

  const member = await prisma.workspaceMember.create({ data: { workspaceId, userId: user.id, role: "MEMBER" } });
  return { id: member.id, userId: member.userId, email: user.email, role: member.role, createdAt: member.createdAt.toISOString() };
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
  const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw new NotFoundError("Workspace member not found");
  if (member.role === "OWNER") throw new ConflictError("The workspace owner cannot be removed");
  await prisma.workspaceMember.delete({ where: { id: memberId } });
}
