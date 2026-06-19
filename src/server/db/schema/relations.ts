import { relations } from "drizzle-orm";
import { apiKeys } from "./api-keys";
import { canvasChatMessages } from "./canvas-chat-messages";
import { collections } from "./collections";
import { histories } from "./histories";
import { itemRags } from "./item-rags";
import { items } from "./items";
import { models } from "./models";
import { ragChunks } from "./rag-chunks";
import { rags } from "./rags";

export const collectionsRelations = relations(collections, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  collection: one(collections, {
    fields: [items.collectionId],
    references: [collections.id],
  }),
  folder: one(items, {
    fields: [items.folderId],
    references: [items.id],
    relationName: "folderHierarchy",
  }),
  children: many(items, { relationName: "folderHierarchy" }),
  histories: many(histories),
  rags: many(itemRags),
  canvasChatMessages: many(canvasChatMessages),
}));

export const historiesRelations = relations(histories, ({ one }) => ({
  item: one(items, {
    fields: [histories.itemId],
    references: [items.id],
  }),
}));

export const canvasChatMessagesRelations = relations(
  canvasChatMessages,
  ({ one }) => ({
    item: one(items, {
      fields: [canvasChatMessages.itemId],
      references: [items.id],
    }),
  }),
);

export const apiKeysRelations = relations(apiKeys, ({ many }) => ({
  models: many(models),
}));

export const modelsRelations = relations(models, ({ one, many }) => ({
  apiKey: one(apiKeys, {
    fields: [models.apiKeyId],
    references: [apiKeys.id],
  }),
  rags: many(rags),
}));

export const ragsRelations = relations(rags, ({ one, many }) => ({
  model: one(models, {
    fields: [rags.modelId],
    references: [models.id],
  }),
  items: many(itemRags),
  chunks: many(ragChunks),
}));

export const itemRagsRelations = relations(itemRags, ({ one }) => ({
  item: one(items, {
    fields: [itemRags.itemId],
    references: [items.id],
  }),
  rag: one(rags, {
    fields: [itemRags.ragId],
    references: [rags.id],
  }),
}));

export const ragChunksRelations = relations(ragChunks, ({ one }) => ({
  rag: one(rags, {
    fields: [ragChunks.ragId],
    references: [rags.id],
  }),
}));
