/**
 * Password hashing via Bun's built-in `Bun.password` (argon2id) — no extra
 * dependency, no native bcrypt build. Server runtime only (not Edge).
 */

export function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain, { algorithm: "argon2id" });
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash);
}

/** Minimum password length enforced on create / change. */
export const MIN_PASSWORD_LENGTH = 8;
