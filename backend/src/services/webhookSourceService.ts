import { Prisma } from "@prisma/client";
import type { WebhookSource } from "@prisma/client";

import { generateApiKey, hashApiKey } from "../lib/apiKey";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import type { UpdateWebhookSourceBody, WebhookSourceCreatedDto, WebhookSourceDto } from "../schemas/webhookSource.schema";
import { sendTestApprovalCallback } from "./webhookCallbackService";

function toWebhookSourceDto(source: WebhookSource): WebhookSourceDto {
  return {
    id: source.id,
    workspaceId: source.workspaceId,
    name: source.name,
    callbackUrl: source.callbackUrl,
    lastReceivedAt: source.lastReceivedAt?.toISOString() ?? null,
    payloadCount: source.payloadCount,
    createdAt: source.createdAt.toISOString(),
  };
}

export async function createWebhookSource(
  workspaceId: string,
  name: string,
): Promise<WebhookSourceCreatedDto> {
  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);

  const source = await prisma.webhookSource.create({
    data: { workspaceId, name, apiKeyHash },
  });

  return { ...toWebhookSourceDto(source), apiKey };
}

export async function listWebhookSources(workspaceId: string): Promise<WebhookSourceDto[]> {
  const sources = await prisma.webhookSource.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return sources.map(toWebhookSourceDto);
}

export async function deleteWebhookSource(workspaceId: string, id: string): Promise<void> {
  const source = await prisma.webhookSource.findFirst({ where: { id, workspaceId } });

  if (!source) {
    throw new NotFoundError("Webhook source not found");
  }

  await prisma.webhookSource.delete({ where: { id } });
}

export async function updateWebhookSource(
  workspaceId: string,
  id: string,
  data: UpdateWebhookSourceBody,
): Promise<WebhookSourceDto> {
  const source = await prisma.webhookSource.findFirst({ where: { id, workspaceId } });

  if (!source) {
    throw new NotFoundError("Webhook source not found");
  }

  const updated = await prisma.webhookSource.update({ where: { id }, data });

  return toWebhookSourceDto(updated);
}

export async function sendTestCallback(workspaceId: string, id: string): Promise<{ ok: boolean }> {
  const source = await prisma.webhookSource.findFirst({ where: { id, workspaceId } });

  if (!source) {
    throw new NotFoundError("Webhook source not found");
  }

  if (!source.callbackUrl) {
    throw new BadRequestError("No callback URL configured for this webhook source");
  }

  await sendTestApprovalCallback(source.callbackUrl);

  return { ok: true };
}

function extractStringField(payload: Prisma.InputJsonValue, key: string): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

async function recordPayload(
  source: WebhookSource,
  payload: Prisma.InputJsonValue,
): Promise<{ id: string }> {
  const [triageItem] = await prisma.$transaction([
    prisma.triageItem.create({
      data: {
        workspaceId: source.workspaceId,
        webhookSourceId: source.id,
        rawPayload: payload,
        title: extractStringField(payload, "title"),
        description: extractStringField(payload, "description"),
        reporter: extractStringField(payload, "reporter"),
        status: "PENDING",
      },
    }),
    prisma.webhookSource.update({
      where: { id: source.id },
      data: { lastReceivedAt: new Date(), payloadCount: { increment: 1 } },
    }),
  ]);

  return { id: triageItem.id };
}

export async function ingestPayload(
  apiKeyPlaintext: string,
  payload: Record<string, unknown>,
): Promise<{ id: string }> {
  const apiKeyHash = hashApiKey(apiKeyPlaintext);
  const source = await prisma.webhookSource.findFirst({ where: { apiKeyHash } });

  if (!source) {
    throw new UnauthorizedError("Invalid API key");
  }

  return recordPayload(source, payload as Prisma.InputJsonValue);
}

const TEST_EVENT_PAYLOAD = {
  title: "Sample bug report",
  description:
    "This is a test event sent from the Webhook Sources page. It shows up in your inbox just like a real " +
    "report would, so you can try out the review and AI enrichment flow.",
  reporter: "Test Player",
  source: "test",
};

export async function createTestEvent(workspaceId: string, id: string): Promise<{ id: string }> {
  const source = await prisma.webhookSource.findFirst({ where: { id, workspaceId } });

  if (!source) {
    throw new NotFoundError("Webhook source not found");
  }

  return recordPayload(source, TEST_EVENT_PAYLOAD);
}
