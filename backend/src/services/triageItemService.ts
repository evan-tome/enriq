import type { TriageItem, TriageStatus } from "@prisma/client";

import { NotFoundError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { TriageItemDto, UpdateTriageItemBody } from "../schemas/triageItem.schema";
import { sendApprovalCallback } from "./webhookCallbackService";

function toTriageItemDto(item: TriageItem): TriageItemDto {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    webhookSourceId: item.webhookSourceId,
    rawPayload: item.rawPayload,
    title: item.title,
    description: item.description,
    reporter: item.reporter,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function listTriageItems(
  workspaceId: string,
  status?: TriageStatus,
): Promise<TriageItemDto[]> {
  const items = await prisma.triageItem.findMany({
    where: { workspaceId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return items.map(toTriageItemDto);
}

export async function getTriageItem(workspaceId: string, id: string): Promise<TriageItemDto> {
  const item = await prisma.triageItem.findFirst({ where: { id, workspaceId } });

  if (!item) {
    throw new NotFoundError("Triage item not found");
  }

  return toTriageItemDto(item);
}

export async function updateTriageItem(
  workspaceId: string,
  id: string,
  data: UpdateTriageItemBody,
): Promise<TriageItemDto> {
  const existing = await prisma.triageItem.findFirst({
    where: { id, workspaceId },
    include: { webhookSource: true },
  });

  if (!existing) {
    throw new NotFoundError("Triage item not found");
  }

  const item = await prisma.triageItem.update({ where: { id }, data });

  if (data.status === "APPROVED" && existing.status !== "APPROVED" && existing.webhookSource?.callbackUrl) {
    void sendApprovalCallback(existing.webhookSource.callbackUrl, toTriageItemDto(item));
  }

  return toTriageItemDto(item);
}
