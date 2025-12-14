import { Suspense } from "react";
import { RequestsView } from "@/features/shift-swaps/components/requests-view";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Requests | Aurea CRM",
  description: "Manage shift swap and time off requests",
};

export default function RequestsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
        <p className="text-sm text-primary/60">
          Review and approve shift swap requests and time off requests from workers
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          </div>
        }
      >
        <RequestsView />
      </Suspense>
    </div>
  );
}
