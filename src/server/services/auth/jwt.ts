import { jwtVerify, SignJWT } from "jose";

/**
 * Edge-safe JWT helpers. Imports `jose` only — NO database, NO `Bun.*` — so
 * this module is safe to use from `middleware.ts` (Edge runtime). Anything that
 * touches the DB or `Bun.password` must live elsewhere (see `session.ts`,
 * `password.ts`).
 */

export const SESSION_COOKIE = "synapse_session";
/** Fixed 7-day session (seconds). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionClaims = {
  /** User id (stringified). */
  sub: string;
  email: string;
};

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET environment variable is not set (or too short). " +
        "Set a random secret of at least 16 characters in .env.",
    );
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

export async function signSessionToken(
  claims: SessionClaims,
): Promise<string> {
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/** Verify a token's signature + expiry. Returns claims or null. No DB access. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
