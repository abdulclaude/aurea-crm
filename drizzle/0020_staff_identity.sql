CREATE TYPE "public"."StaffIdentityStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
--> statement-breakpoint
CREATE TABLE "StaffIdentity" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text,
	"displayName" text NOT NULL,
	"email" text,
	"normalizedEmail" text,
	"phone" text,
	"status" "StaffIdentityStatus" DEFAULT 'ACTIVE' NOT NULL,
	"createdById" text,
	"updatedById" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StaffIdentity" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "Invitation" ADD COLUMN "staffIdentityId" text;
--> statement-breakpoint
ALTER TABLE "Member" ADD COLUMN "staffIdentityId" text;
--> statement-breakpoint
ALTER TABLE "LocationMember" ADD COLUMN "staffIdentityId" text;
--> statement-breakpoint
ALTER TABLE "Instructor" ADD COLUMN "staffIdentityId" text;
--> statement-breakpoint
ALTER TABLE "StudioStaffMember" ADD COLUMN "staffIdentityId" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "StaffIdentity_organizationId_userId_key" ON "StaffIdentity" USING btree ("organizationId", "userId") WHERE "userId" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "StaffIdentity_organizationId_status_idx" ON "StaffIdentity" USING btree ("organizationId", "status");
--> statement-breakpoint
CREATE INDEX "StaffIdentity_organizationId_normalizedEmail_idx" ON "StaffIdentity" USING btree ("organizationId", "normalizedEmail");
--> statement-breakpoint
CREATE INDEX "Invitation_staffIdentityId_idx" ON "Invitation" USING btree ("staffIdentityId");
--> statement-breakpoint
CREATE UNIQUE INDEX "Member_staffIdentityId_key" ON "Member" USING btree ("staffIdentityId") WHERE "staffIdentityId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "LocationMember_locationId_staffIdentityId_key" ON "LocationMember" USING btree ("locationId", "staffIdentityId") WHERE "staffIdentityId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "Instructor_locationId_staffIdentityId_key" ON "Instructor" USING btree ("locationId", "staffIdentityId") WHERE "staffIdentityId" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "StudioStaffMember_locationId_staffIdentityId_key" ON "StudioStaffMember" USING btree ("locationId", "staffIdentityId") WHERE "staffIdentityId" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "StaffIdentity" ADD CONSTRAINT "StaffIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "StaffIdentity" ADD CONSTRAINT "StaffIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "StaffIdentity" ADD CONSTRAINT "StaffIdentity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "StaffIdentity" ADD CONSTRAINT "StaffIdentity_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_staffIdentityId_fkey" FOREIGN KEY ("staffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "Member" ADD CONSTRAINT "Member_staffIdentityId_fkey" FOREIGN KEY ("staffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_staffIdentityId_fkey" FOREIGN KEY ("staffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_staffIdentityId_fkey" FOREIGN KEY ("staffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "StudioStaffMember" ADD CONSTRAINT "StudioStaffMember_staffIdentityId_fkey" FOREIGN KEY ("staffIdentityId") REFERENCES "public"."StaffIdentity"("id") ON DELETE set null ON UPDATE cascade;
