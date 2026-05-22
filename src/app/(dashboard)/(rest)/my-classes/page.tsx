"use client";

import { Suspense, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { Plus } from "lucide-react";
import { MyClassesTable } from "@/features/instructors/components/my-classes-table";
import { CreateClassDialog } from "@/features/studio/components/create-class-dialog";
import { useIsInstructor } from "@/features/instructors/hooks/use-is-instructor";

export default function MyClassesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { instructor } = useIsInstructor();

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">My classes</h1>
          <p className="text-xs text-primary/75">
            View and manage your assigned classes
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="size-3.5" />
          Schedule class
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <MyClassesTable />
      </Suspense>

      <CreateClassDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        forInstructorId={instructor?.id}
      />
    </div>
  );
}
