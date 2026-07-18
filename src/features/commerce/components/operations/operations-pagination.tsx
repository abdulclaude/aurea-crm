import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OperationsPagination({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  if (!hasNextPage) return null;
  return (
    <div className="flex justify-center border-t border-black/5 p-4 dark:border-white/5">
      <Button
        variant="outline"
        size="sm"
        disabled={isFetchingNextPage}
        onClick={onLoadMore}
      >
        {isFetchingNextPage && <Loader2 className="size-3.5 animate-spin" />}
        Load more
      </Button>
    </div>
  );
}
