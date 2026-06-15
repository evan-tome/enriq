import { ForbiddenError } from "./errors";
import { prisma } from "./prisma";

export async function requireWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!member) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  return member;
}
