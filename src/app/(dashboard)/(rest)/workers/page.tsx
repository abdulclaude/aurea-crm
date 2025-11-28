import { LoaderCircle } from "lucide-react";
import { Suspense } from "react";
import { WorkersTable } from "@/features/workers/components/workers-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { IconConstructionHelmet as UserPlusIcon } from "central-icons/IconConstructionHelmet";
import { CreateWorkerDialog } from "@/features/workers/components/create-worker-dialog";

export default async function WorkersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Workers</h1>
          <p className="text-xs text-primary/75">
            Manage field workers and portal access
          </p>
        </div>

        <CreateWorkerDialog>
          <Button variant="outline" size="sm">
            <UserPlusIcon className="size-3.5" />
            Add Worker
          </Button>
        </CreateWorkerDialog>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading workers...
          </div>
        }
      >
        <WorkersTable />
      </Suspense>
    </div>
  );
}
