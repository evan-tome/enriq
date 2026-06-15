import { randomBytes } from "node:crypto";

import type { Workspace, WorkspaceRole } from "@prisma/client";

import { encryptValue } from "../lib/encryption";
import { ConflictError, NotFoundError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { UpdateWorkspaceBody, WorkspaceDto, WorkspaceMemberDto } from "../schemas/workspace.schema";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = randomBytes(3).toString("hex");

  return base ? `${base}-${suffix}` : suffix;
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
  const slug = slugify(name);

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({ data: { name, slug, ownerId } });

    await tx.workspaceMember.create({
      data: { workspaceId: created.id, userId: ownerId, role: "OWNER" },
    });

    return created;
  });

  return toWorkspaceDto(workspace, "OWNER");
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceDto[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
  });

  return members.map((member) => toWorkspaceDto(member.workspace, member.role));
}

export async function getWorkspace(workspaceId: string, role: WorkspaceRole): Promise<WorkspaceDto> {
  const workspace = await getWorkspaceEntity(workspaceId);

  return toWorkspaceDto(workspace, role);
}

/** Returns the raw Workspace record, including encrypted credentials, for internal use. */
export async function getWorkspaceEntity(workspaceId: string): Promise<Workspace> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace) {
    throw new NotFoundError("Workspace not found");
  }

  return workspace;
}

export async function updateWorkspace(
  workspaceId: string,
  role: WorkspaceRole,
  data: UpdateWorkspaceBody,
): Promise<WorkspaceDto> {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.jiraBaseUrl !== undefined) {
    updateData.jiraBaseUrl = data.jiraBaseUrl;
  }
  if (data.jiraEmail !== undefined) {
    updateData.jiraEmail = data.jiraEmail;
  }
  if (data.jiraProjectKey !== undefined) {
    updateData.jiraProjectKey = data.jiraProjectKey;
  }
  if (data.githubRepo !== undefined) {
    updateData.githubRepo = data.githubRepo;
  }
  if (data.assigneeMapping !== undefined) {
    updateData.assigneeMapping = data.assigneeMapping;
  }
  if (data.ollamaUrl !== undefined) {
    updateData.ollamaUrl = data.ollamaUrl;
  }

  if (data.jiraApiToken !== undefined) {
    updateData.jiraApiTokenEncrypted = data.jiraApiToken ? encryptValue(data.jiraApiToken) : null;
  }
  if (data.githubToken !== undefined) {
    updateData.githubTokenEncrypted = data.githubToken ? encryptValue(data.githubToken) : null;
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: updateData,
  });

  return toWorkspaceDto(workspace, role);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await prisma.workspace.delete({ where: { id: workspaceId } });
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    email: member.user.email,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  }));
}

export async function addWorkspaceMember(workspaceId: string, email: string): Promise<WorkspaceMemberDto> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new NotFoundError("No user found with that email");
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });

  if (existing) {
    throw new ConflictError("This user is already a member of the workspace");
  }

  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId: user.id, role: "MEMBER" },
  });

  return {
    id: member.id,
    userId: member.userId,
    email: user.email,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  };
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
  const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });

  if (!member) {
    throw new NotFoundError("Workspace member not found");
  }

  if (member.role === "OWNER") {
    throw new ConflictError("The workspace owner cannot be removed");
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });
}
