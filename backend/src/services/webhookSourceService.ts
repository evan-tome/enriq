import { Prisma } from "@prisma/client";
import type { WebhookSource } from "@prisma/client";

import { generateApiKey, hashApiKey } from "../lib/apiKey";
import { NotFoundError, UnauthorizedError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { WebhookSourceCreatedDto, WebhookSourceDto } from "../schemas/webhookSource.schema";

function toWebhookSourceDto(source: WebhookSource): WebhookSourceDto {
  return {
    id: source.id,
    workspaceId: source.workspaceId,
    name: source.name,
    lastReceivedAt: source.lastReceivedAt?.toISOString() ?? null,
    payloadCount: source.payloadCount,
    createdAt: source.createdAt.toISOString(),
  };
}

function extractString(payload: Prisma.InputJsonValue, key: string): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

async function recordPayload(source: WebhookSource, payload: Prisma.InputJsonValue): Promise<{ id: string }> {
  const [triageItem] = await prisma.$transaction([
    prisma.triageItem.create({
      data: {
        workspaceId: source.workspaceId,
        webhookSourceId: source.id,
        rawPayload: payload,
        title: extractString(payload, "title"),
        description: extractString(payload, "description"),
        reporter: extractString(payload, "reporter"),
        status: "PENDING",
      },
    }),
    prisma.webhookSource.update({ where: { id: source.id }, data: { lastReceivedAt: new Date(), payloadCount: { increment: 1 } } }),
  ]);
  return { id: triageItem.id };
}

export async function createWebhookSource(workspaceId: string, name: string): Promise<WebhookSourceCreatedDto> {
  const apiKey = generateApiKey();
  const source = await prisma.webhookSource.create({ data: { workspaceId, name, apiKeyHash: hashApiKey(apiKey) } });
  return { ...toWebhookSourceDto(source), apiKey };
}

export async function listWebhookSources(workspaceId: string): Promise<WebhookSourceDto[]> {
  const sources = await prisma.webhookSource.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  return sources.map(toWebhookSourceDto);
}

export async function deleteWebhookSource(workspaceId: string, id: string): Promise<void> {
  await prisma.webhookSource.deleteMany({ where: { id, workspaceId } });
}

export async function createTestEvent(workspaceId: string, id: string): Promise<{ id: string }> {
  const source = await prisma.webhookSource.findFirst({ where: { id, workspaceId } });
  if (!source) throw new NotFoundError("Webhook source not found");
  return recordPayload(source, { title: "Test event", description: "This is a test event sent from the Enriq dashboard.", reporter: "enriq-test" });
}

export async function ingestPayload(apiKeyPlaintext: string, payload: Record<string, unknown>): Promise<{ id: string }> {
  const source = await prisma.webhookSource.findFirst({ where: { apiKeyHash: hashApiKey(apiKeyPlaintext) } });
  if (!source) throw new UnauthorizedError("Invalid API key");
  return recordPayload(source, payload as Prisma.InputJsonValue);
}
