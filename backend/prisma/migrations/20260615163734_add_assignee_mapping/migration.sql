-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "assignee_mapping" JSONB NOT NULL DEFAULT '{}';
