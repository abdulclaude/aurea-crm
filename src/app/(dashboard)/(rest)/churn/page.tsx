"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Suspense } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";
import { ChurnTable } from "@/features/churn/components/churn-table";

function RecalculateButton() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const calculateMutation = useMutation(
    trpc.churn.calculateForAll.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Churn scores recalculated");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => calculateMutation.mutate()}
      disabled={calculateMutation.isPending}
      className="text-xs"
    >
      <RefreshCw
        className={`size-3 ${calculateMutation.isPending ? "animate-spin" : ""}`}
      />
      {calculateMutation.isPending ? "Calculating..." : "Recalculate"}
    </Button>
  );
}

export default function ChurnPage() {
  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Churn prediction
          </h1>
          <p className="text-xs text-primary/70">
            Identify at-risk members and take proactive action.
          </p>
        </div>
        <RecalculateButton />
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12 text-sm text-primary/40">
            Loading churn data...
          </div>
        }
      >
        <ChurnTable />
      </Suspense>
    </div>
  );
}
