import type {
  CreateUserFormValues,
  UpdateUserFormValues,
  UserRecord,
} from "@/components/container/users/types";
import { userRepository, type NewUser } from "@/server/db/repository";
import { hashPassword, MIN_PASSWORD_LENGTH } from "./auth/password";
import { toUserRecord } from "./mappers";
import { assertFound, parseId, ServiceError } from "./utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    throw new ServiceError("Enter a valid email address", "VALIDATION");
  }
  return normalized;
}

function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      "VALIDATION",
    );
  }
}

/** Management CRUD for users. Any logged-in user may call these (no roles). */
export class UserService {
  async list(): Promise<UserRecord[]> {
    const rows = await userRepository.findAll();
    return rows.map(toUserRecord);
  }

  async create(values: CreateUserFormValues): Promise<UserRecord> {
    const email = assertValidEmail(values.email);
    assertValidPassword(values.password);

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ServiceError("A user with this email already exists", "CONFLICT");
    }

    const row = await userRepository.create({
      email,
      name: values.name.trim(),
      passwordHash: await hashPassword(values.password),
      status: values.active ? "active" : "inactive",
    });

    return toUserRecord(assertFound(row, "Failed to create user"));
  }

  async update(id: string, values: UpdateUserFormValues): Promise<UserRecord> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid user id", "VALIDATION");
    }

    const nextStatus = values.active ? "active" : "inactive";
    // Lockout guard: never let the last active user be deactivated.
    if (nextStatus === "inactive") {
      const otherActive = await userRepository.countActive(numericId);
      if (otherActive === 0) {
        throw new ServiceError(
          "Cannot deactivate the last active user",
          "VALIDATION",
        );
      }
    }

    const patch: Partial<Omit<NewUser, "id">> = {
      name: values.name.trim(),
      status: nextStatus,
    };

    const row = await userRepository.update(numericId, patch);
    return toUserRecord(assertFound(row, "User not found"));
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid user id", "VALIDATION");
    }
    assertValidPassword(newPassword);

    const row = await userRepository.update(numericId, {
      passwordHash: await hashPassword(newPassword),
    });
    assertFound(row, "User not found");
  }

  async remove(id: string): Promise<void> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid user id", "VALIDATION");
    }

    const target = assertFound(
      await userRepository.findById(numericId),
      "User not found",
    );

    // Lockout guard: block deleting the last remaining active user.
    if (target.status === "active") {
      const otherActive = await userRepository.countActive(numericId);
      if (otherActive === 0) {
        throw new ServiceError(
          "Cannot delete the last active user",
          "VALIDATION",
        );
      }
    }

    await userRepository.delete(numericId);
  }
}

export const userService = new UserService();
