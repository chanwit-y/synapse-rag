import { and, asc, eq, ne, sql } from "drizzle-orm";
import { users, type NewUser, type User } from "../schema/users";
import { type Database, resolveDb } from "./base";

export class UserRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  findByEmail(email: string) {
    return this.database.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  findAll() {
    return this.database.query.users.findMany({
      orderBy: asc(users.email),
    });
  }

  /** Count active users, optionally excluding one id (for lockout guards). */
  async countActive(excludeId?: number): Promise<number> {
    const rows = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        excludeId == null
          ? eq(users.status, "active")
          : and(eq(users.status, "active"), ne(users.id, excludeId)),
      );
    return Number(rows[0]?.count ?? 0);
  }

  create(data: NewUser) {
    return this.database
      .insert(users)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  update(id: number, data: Partial<Omit<NewUser, "id">>) {
    return this.database
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(users)
      .where(eq(users.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const userRepository = new UserRepository();

export type { User, NewUser };
