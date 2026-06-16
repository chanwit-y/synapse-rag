import { and, asc, eq, isNull } from "drizzle-orm";
import { items, type Item, type NewItem } from "../schema/items";
import { type Database, resolveDb } from "./base";

export class ItemRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.items.findFirst({
      where: eq(items.id, id),
    });
  }

  findByCollectionId(collectionId: number) {
    return this.database.query.items.findMany({
      where: eq(items.collectionId, collectionId),
      orderBy: asc(items.name),
    });
  }

  /**
   * Like {@link findByCollectionId} but omits the heavy content columns
   * (`content`, `contentTh`, `contentThHash`) — used to build the document
   * tree, whose payload otherwise carries every document's full text.
   */
  findTreeByCollectionId(collectionId: number) {
    return this.database.query.items.findMany({
      where: eq(items.collectionId, collectionId),
      orderBy: asc(items.name),
      columns: {
        content: false,
        contentTh: false,
        contentThHash: false,
      },
    });
  }

  findRootsByCollectionId(collectionId: number) {
    return this.database.query.items.findMany({
      where: and(
        eq(items.collectionId, collectionId),
        isNull(items.folderId),
      ),
      orderBy: asc(items.name),
      with: { children: true },
    });
  }

  findByFolderId(folderId: number) {
    return this.database.query.items.findMany({
      where: eq(items.folderId, folderId),
      orderBy: asc(items.name),
    });
  }

  findWithHistories(id: number) {
    return this.database.query.items.findFirst({
      where: eq(items.id, id),
      with: {
        histories: true,
        collection: true,
        folder: true,
        rags: { with: { rag: true } },
      },
    });
  }

  create(data: NewItem) {
    return this.database
      .insert(items)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  update(id: number, data: Partial<Omit<NewItem, "id">>) {
    return this.database
      .update(items)
      .set(data)
      .where(eq(items.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(items)
      .where(eq(items.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}

export const itemRepository = new ItemRepository();

export type { Item, NewItem };
