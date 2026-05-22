ALTER TABLE "task" DROP CONSTRAINT "task_createdById_fkey";
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;