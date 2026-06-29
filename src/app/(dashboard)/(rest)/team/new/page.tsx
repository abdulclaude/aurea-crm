"use client";

import { Separator } from "@/components/ui/separator";
import { CreateStaffForm } from "@/features/staff/components/create-staff-form";

export default function NewTeamMemberPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Add staff</h1>
          <p className="text-xs text-primary/75">
            Add a new team member to your studio.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />
      <CreateStaffForm />
    </div>
  );
}
