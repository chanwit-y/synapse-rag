import { eq } from "drizzle-orm";
import {
  appSettings,
  type AppSetting,
  type NewAppSetting,
} from "../schema/app-settings";
import { type Database, resolveDb } from "./base";

export class AppSettingRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findByKey(key: string) {
    return this.database.query.appSettings.findFirst({
      where: eq(appSettings.key, key),
    });
  }

  /** Upsert the model a setting points at, keyed by `key`. */
  setModelId(key: string, modelId: number | null) {
    return this.database
      .insert(appSettings)
      .values({ key, modelId })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { modelId, updatedAt: new Date() },
      })
      .returning()
      .then((rows) => rows[0]);
  }
}

export const appSettingRepository = new AppSettingRepository();

export type { AppSetting, NewAppSetting };
