import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function CancellationQueryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Empty className="min-h-64 rounded-none border-0">
      <EmptyHeader>
        <EmptyMedia>
          <AlertCircle aria-hidden="true" className="size-5 text-rose-500" />
        </EmptyMedia>
        <EmptyTitle>Cancellation settings unavailable</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </Empty>
  );
}
