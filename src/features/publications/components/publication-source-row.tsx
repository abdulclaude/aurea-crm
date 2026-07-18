import { AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KIND_LABELS,
  type PublicationSource,
} from "@/features/publications/components/publication-ui-types";

type Props = {
  source: PublicationSource;
  isCreating: boolean;
  onCreate: (source: PublicationSource) => void;
  onOpenTarget: (id: string) => void;
};

export function PublicationSourceRow({
  source,
  isCreating,
  onCreate,
  onOpenTarget,
}: Props): React.JSX.Element {
  const targetId = source.targetId;
  return (
    <div className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{source.name}</p>
          <Badge variant="outline">{KIND_LABELS[source.kind]}</Badge>
        </div>
        {source.unavailableReason ? (
          <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            {source.unavailableReason}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {source.sourceKey}
          </p>
        )}
      </div>
      {targetId ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenTarget(targetId)}
        >
          Manage
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => onCreate(source)}
          disabled={isCreating}
        >
          Create draft
        </Button>
      )}
    </div>
  );
}
