import dotenv from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";


dotenv.config()

dotenv.config({
  path: path.resolve("../../apps/server/.env"),
  override: false
});

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "bun run prisma/seed/rbac.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
