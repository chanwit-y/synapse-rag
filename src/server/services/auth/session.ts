import { cookies } from "next/headers";
import type { UserRecord } from "@/components/container/users/types";
import { userRepository } from "@/server/db/repository";
import { toUserRecord } from "../mappers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
} from "./jwt";

/**
 * Resolve the current session: verify the cookie's JWT, then re-check against
 * the DB that the user still exists and is active. This re-validation runs on
 * each server render, so deactivation/deletion takes effect on the next
 * navigation rather than waiting for the 7-day token to expire.
 */
export async function getSession(): Promise<UserRecord | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const id = Number(claims.sub);
  if (!Number.isInteger(id) || id <= 0) return null;

  const row = await userRepository.findById(id);
  if (!row || row.status !== "active") return null;

  return toUserRecord(row);
}

export async function setSessionCookie(
  userId: number,
  email: string,
): Promise<void> {
  const token = await signSessionToken({ sub: String(userId), email });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
