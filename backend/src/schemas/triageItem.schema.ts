import { z } from "zod";

export const TRIAGE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "ENRICHING", "ENRICHED"] as const;

export const triageItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  webhookSourceId: z.string().nullable(),
  rawPayload: z.unknown(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  reporter: z.string().nullable(),
  status: z.enum(TRIAGE_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const updateTriageItemBodySchema = z.object({
  status: z.enum(TRIAGE_STATUSES).optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  reporter: z.string().nullable().optional(),
});

export type TriageItemDto = z.infer<typeof triageItemSchema>;
export type UpdateTriageItemBody = z.infer<typeof updateTriageItemBodySchema>;
