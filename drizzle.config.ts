import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema",
  out: "./src/server/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
