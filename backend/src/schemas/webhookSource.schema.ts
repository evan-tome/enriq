import { z } from "zod";

export const createWebhookSourceBodySchema = z.object({
  name: z.string().min(1).max(100),
});

export const webhookSourceSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  lastReceivedAt: z.string().nullable(),
  payloadCount: z.number(),
  createdAt: z.string(),
});

export const webhookSourceCreatedSchema = webhookSourceSchema.extend({
  apiKey: z.string(),
});

export type CreateWebhookSourceBody = z.infer<typeof createWebhookSourceBodySchema>;
export type WebhookSourceDto = z.infer<typeof webhookSourceSchema>;
export type WebhookSourceCreatedDto = z.infer<typeof webhookSourceCreatedSchema>;
