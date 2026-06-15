import { env } from "../env";
import { ConflictError, UnauthorizedError } from "../lib/errors";
import { signAccessToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { generateRefreshToken, hashRefreshToken } from "../lib/refreshToken";
import type { UserPublic } from "../schemas/user.schema";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function toUserPublic(user: { id: string; email: string; createdAt: Date }): UserPublic {
  return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() };
}

export async function registerUser(email: string, password: string): Promise<UserPublic> {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new ConflictError("A user with this email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, hashedPassword } });

  return toUserPublic(user);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string }> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.hashedPassword))) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  return { id: user.id, email: user.email };
}

export async function createTokenPair(userId: string): Promise<TokenPair> {
  const accessToken = signAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS);

  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(rawToken: string): Promise<TokenPair> {
  const tokenHash = hashRefreshToken(rawToken);
  const existing = await prisma.refreshToken.findFirst({ where: { tokenHash } });

  if (!existing || existing.revoked || existing.expiresAt < new Date()) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const [, tokens] = await Promise.all([
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revoked: true },
    }),
    createTokenPair(existing.userId),
  ]);

  return tokens;
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
}
