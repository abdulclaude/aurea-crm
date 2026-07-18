import { AlertCircle, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function OperationsTableState({
  isLoading,
  error,
  isEmpty,
  emptyTitle,
  onRetry,
}: {
  isLoading: boolean;
  error: { message: string } | null;
  isEmpty: boolean;
  emptyTitle: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-6" aria-label="Loading payment operations">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Empty className="min-h-64 rounded-none border-0">
        <EmptyHeader>
          <EmptyMedia><AlertCircle aria-hidden="true" className="size-5 text-rose-500" /></EmptyMedia>
          <EmptyTitle>Payment operations unavailable</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </Empty>
    );
  }

  if (isEmpty) {
    return (
      <Empty className="min-h-64 rounded-none border-0">
        <EmptyHeader>
          <EmptyMedia><Database aria-hidden="true" className="size-5 text-primary/40" /></EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return null;
}
