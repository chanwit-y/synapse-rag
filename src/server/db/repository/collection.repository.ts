import { asc, eq } from "drizzle-orm";
import {
  collections,
  type Collection,
  type NewCollection,
} from "../schema/collections";
import { type Database, resolveDb } from "./base";

export class CollectionRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.collections.findFirst({
      where: eq(collections.id, id),
    });
  }

  findAll() {
    return this.database.query.collections.findMany({
      orderBy: asc(collections.name),
    });
  }

  findWithItems(id: number) {
    return this.database.query.collections.findFirst({
      where: eq(collections.id, id),
      with: {
        items: {
          with: {
            children: true,
            histories: true,
          },
        },
      },
    });
  }

  create(data: NewCollection) {
    return this.database
      .insert(collections)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  update(id: number, data: Partial<Omit<NewCollection, "id">>) {
    return this.database
      .update(collections)
      .set(data)
      .where(eq(collections.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(collections)
      .where(eq(collections.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const collectionRepository = new CollectionRepository();

export type { Collection, NewCollection };
