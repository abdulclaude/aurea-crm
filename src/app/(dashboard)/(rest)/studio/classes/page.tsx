import { Suspense } from "react";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClassesTable } from "@/features/modules/pilates-studio/components/classes-table";
import { ClassViewSwitcher } from "@/features/studio/components/class-view-switcher";
import { Separator } from "@/components/ui/separator";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";

export default function StudioClassesPage() {
  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Studio classes</h1>
          <p className="text-xs text-primary/75">
            View and manage your studio class schedule
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClassViewSwitcher activeView="classes" />
          <Button asChild>
            <Link href="/studio/classes/new">
              <CalendarPlus className="size-4" />
              Add class
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ClassesTable />
      </Suspense>
    </div>
  );
}
