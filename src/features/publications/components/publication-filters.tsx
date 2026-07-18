import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KIND_LABELS,
  PUBLICATION_KINDS,
} from "@/features/publications/components/publication-ui-types";
import type { PublicationKind } from "@/features/publications/contracts";

export type PublicationStatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "PAUSED";

type Props = {
  query: string;
  kind: PublicationKind | "ALL";
  status: PublicationStatusFilter;
  onQueryChange: (value: string) => void;
  onKindChange: (value: PublicationKind | "ALL") => void;
  onStatusChange: (value: PublicationStatusFilter) => void;
};

export function PublicationFilters({
  query,
  kind,
  status,
  onQueryChange,
  onKindChange,
  onStatusChange,
}: Props): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:px-8">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search publication targets"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name, slug, or domain"
          className="h-8 pl-9 text-xs"
        />
      </div>
      <Select
        value={kind}
        onValueChange={(value) =>
          onKindChange(value as PublicationKind | "ALL")
        }
      >
        <SelectTrigger size="sm" aria-label="Filter publication type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All types</SelectItem>
          {PUBLICATION_KINDS.map((value) => (
            <SelectItem key={value} value={value}>
              {KIND_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={status}
        onValueChange={(value) =>
          onStatusChange(value as PublicationStatusFilter)
        }
      >
        <SelectTrigger size="sm" aria-label="Filter publication status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="PUBLISHED">Published</SelectItem>
          <SelectItem value="PAUSED">Paused</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
