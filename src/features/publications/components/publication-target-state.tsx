import { Globe2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicationTargetsList } from "@/features/publications/components/publication-targets-list";
import type { PublicationTargetSummary } from "@/features/publications/components/publication-ui-types";

type Props = {
  isLoading: boolean;
  error: { message: string } | null;
  totalCount: number;
  targets: PublicationTargetSummary[];
  onRetry: () => void;
  onOpen: (id: string) => void;
};

export function PublicationTargetState({
  isLoading,
  error,
  totalCount,
  targets,
  onRetry,
  onOpen,
}: Props): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-2 p-6 sm:px-8">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Empty className="min-h-72 rounded-none border-0">
        <EmptyHeader>
          <EmptyTitle>Publishing is unavailable</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </Empty>
    );
  }
  if (targets.length === 0) {
    return (
      <Empty className="min-h-72 rounded-none border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Globe2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            {totalCount ? "No matching targets" : "No publication targets"}
          </EmptyTitle>
          <EmptyDescription>
            {totalCount
              ? "Adjust the filters to see more targets."
              : "Create a draft from an existing funnel, schedule, price, form, gift card, or widget source."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <PublicationTargetsList targets={targets} onOpen={onOpen} />;
}
