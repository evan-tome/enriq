import { z } from "zod";

export const userPublicSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export type UserPublic = z.infer<typeof userPublicSchema>;
