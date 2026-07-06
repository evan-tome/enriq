import { readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "@jest/globals";

const MIGRATION_PATH = path.join(__dirname, "../prisma/migrations/20260613000000_init/migration.sql");

describe("init migration", () => {
  it("creates all tables and enums", async () => {
    const db = new PGlite();
    const sql = readFileSync(MIGRATION_PATH, "utf-8");

    await db.exec(sql);

    const tables = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const tableNames = tables.rows.map((row) => row.table_name);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "users",
        "workspaces",
        "workspace_members",
        "refresh_tokens",
        "webhook_sources",
        "triage_items",
        "issues",
      ]),
    );

    const enums = await db.query<{ typname: string }>(
      "SELECT typname FROM pg_type WHERE typtype = 'e'",
    );
    const enumNames = enums.rows.map((row) => row.typname);

    expect(enumNames).toEqual(
      expect.arrayContaining([
        "workspace_role",
        "triage_status",
        "issue_source",
        "issue_complexity",
        "issue_priority",
        "issue_status",
      ]),
    );

    await db.close();
  });
});
