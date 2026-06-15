-- Drop existing priority values (they used the old P0-P3 scale and no longer make sense)
UPDATE "issues" SET "priority" = NULL;

-- Convert the priority column from the issue_priority enum to free-form text
ALTER TABLE "issues" ALTER COLUMN "priority" TYPE TEXT USING ("priority"::text);

-- Drop the now-unused enum type
DROP TYPE "issue_priority";

-- Drop the now-unused priority mapping column
ALTER TABLE "workspaces" DROP COLUMN "jira_priority_mapping";
