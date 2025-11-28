import { Suspense } from "react";
import { LogsTable } from "@/features/ai/components/logs-table";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { Separator } from "@/components/ui/separator";

export default function LogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-xl font-bold text-primary">AI Logs</h1>

          <p className="text-xs text-primary/75">
            View and manage all AI assistant interactions and logs
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoaderIcon className="size-8 animate-spin text-primary/60" />
          </div>
        }
      >
        <LogsTable />
      </Suspense>
    </div>
  );
}
