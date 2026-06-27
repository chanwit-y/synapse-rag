import type { UserRecord } from "@/components/container/users/types";
import type { User } from "@/server/db/repository";
import { toIdString, toIsoString } from "../utils";

/** Map a DB user row to the client view model. Omits `passwordHash`. */
export function toUserRecord(row: User): UserRecord {
  return {
    id: toIdString(row.id),
    email: row.email,
    name: row.name,
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}
