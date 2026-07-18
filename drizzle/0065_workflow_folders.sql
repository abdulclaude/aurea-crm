CREATE TABLE "WorkflowFolder" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "color" text,
  "icon" text,
  "position" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  "userId" text NOT NULL,
  "organizationId" text NOT NULL,
  "locationId" text
);
ALTER TABLE "WorkflowFolder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowFolder" ADD CONSTRAINT "WorkflowFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "WorkflowFolder" ADD CONSTRAINT "WorkflowFolder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE set null ON UPDATE cascade;
ALTER TABLE "WorkflowFolder" ADD CONSTRAINT "WorkflowFolder_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "Location"("organizationId", "id") ON UPDATE cascade;
ALTER TABLE "WorkflowFolder" ADD CONSTRAINT "WorkflowFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE cascade ON UPDATE cascade;
CREATE INDEX "WorkflowFolder_organizationId_idx" ON "WorkflowFolder" ("organizationId");
CREATE INDEX "WorkflowFolder_locationId_idx" ON "WorkflowFolder" ("locationId");
CREATE INDEX "WorkflowFolder_userId_position_idx" ON "WorkflowFolder" ("userId", "position");
CREATE INDEX "WorkflowFolder_scope_position_idx" ON "WorkflowFolder" ("organizationId", "locationId", "userId", "position");
CREATE UNIQUE INDEX "WorkflowFolder_scope_id_key" ON "WorkflowFolder" ("organizationId", "locationId", "userId", "id");
ALTER TABLE "Workflows" ADD COLUMN "folderId" text;
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WorkflowFolder"("id") ON DELETE set null ON UPDATE cascade;
ALTER TABLE "Workflows" ADD CONSTRAINT "Workflows_folder_scope_fkey" FOREIGN KEY ("organizationId", "locationId", "userId", "folderId") REFERENCES "WorkflowFolder"("organizationId", "locationId", "userId", "id") ON UPDATE cascade;
CREATE INDEX "Workflows_folderId_idx" ON "Workflows" ("folderId");
CREATE INDEX "Workflows_scope_status_updatedAt_idx" ON "Workflows" ("organizationId", "locationId", "userId", "archived", "isTemplate", "updatedAt");
CREATE INDEX "Execution_scope_startedAt_idx" ON "Execution" ("organizationId", "locationId", "startedAt");
CREATE INDEX "Execution_workflowId_idx" ON "Execution" ("workflowId");
