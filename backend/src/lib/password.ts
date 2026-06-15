import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// bcrypt only considers the first 72 bytes of the input.
const MAX_PASSWORD_BYTES = 72;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password.slice(0, MAX_PASSWORD_BYTES), SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password.slice(0, MAX_PASSWORD_BYTES), hash);
}
