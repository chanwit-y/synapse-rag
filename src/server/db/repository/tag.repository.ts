import { asc, eq, sql } from "drizzle-orm";
import { tags, type NewTag, type Tag } from "../schema/tags";
import { type Database, resolveDb } from "./base";

export class TagRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  /** Look up a tag by name, case-insensitively (global names are unique). */
  findByName(name: string) {
    return this.database.query.tags.findFirst({
      where: sql`lower(${tags.name}) = lower(${name})`,
    });
  }

  findAll() {
    return this.database.query.tags.findMany({ orderBy: asc(tags.name) });
  }

  create(data: NewTag) {
    return this.database
      .insert(tags)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(tags)
      .where(eq(tags.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const tagRepository = new TagRepository();

export type { Tag, NewTag };
