import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_EXPIRES_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),

  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required"),

  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),

  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  REFRESH_COOKIE_NAME: z.string().default("refresh_token"),
  REFRESH_COOKIE_PATH: z.string().default("/auth"),

  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("codellama"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
