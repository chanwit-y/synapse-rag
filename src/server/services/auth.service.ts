import type { UserRecord } from "@/components/container/users/types";
import { userRepository } from "@/server/db/repository";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
} from "./auth/session";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "./auth/password";
import { toUserRecord } from "./mappers";
import { normalizeEmail } from "./user.service";
import { assertFound, ServiceError } from "./utils";

/** Login, logout, current-session, and self-service account actions. */
export class AuthService {
  /** Verify credentials and issue a session cookie. */
  async login(email: string, password: string): Promise<UserRecord> {
    const invalid = new ServiceError("Invalid email or password", "UNAUTHORIZED");

    const row = await userRepository.findByEmail(normalizeEmail(email));
    // Verify even when the user is missing/inactive to avoid leaking which
    // emails exist, then reject uniformly.
    const ok =
      row != null && (await verifyPassword(password, row.passwordHash));
    if (!row || !ok || row.status !== "active") {
      throw invalid;
    }

    await setSessionCookie(row.id, row.email);
    return toUserRecord(row);
  }

  async logout(): Promise<void> {
    await clearSessionCookie();
  }

  /** The currently authenticated user, or null. Re-validated against the DB. */
  getCurrentUser(): Promise<UserRecord | null> {
    return getSession();
  }

  async changeOwnPassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const session = await getSession();
    if (!session) {
      throw new ServiceError("Not authenticated", "UNAUTHORIZED");
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ServiceError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        "VALIDATION",
      );
    }

    const row = assertFound(
      await userRepository.findById(Number(session.id)),
      "User not found",
    );
    if (!(await verifyPassword(currentPassword, row.passwordHash))) {
      throw new ServiceError("Current password is incorrect", "VALIDATION");
    }

    await userRepository.update(row.id, {
      passwordHash: await hashPassword(newPassword),
    });
  }

  async updateOwnName(name: string): Promise<UserRecord> {
    const session = await getSession();
    if (!session) {
      throw new ServiceError("Not authenticated", "UNAUTHORIZED");
    }
    const row = await userRepository.update(Number(session.id), {
      name: name.trim(),
    });
    return toUserRecord(assertFound(row, "User not found"));
  }
}

export const authService = new AuthService();
