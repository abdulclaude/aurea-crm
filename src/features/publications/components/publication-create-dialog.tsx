"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, FilePlus2, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicationSourceRow } from "@/features/publications/components/publication-source-row";
import {
  createInputForSource,
  KIND_LABELS,
  PUBLICATION_KINDS,
  type PublicationSource,
} from "@/features/publications/components/publication-ui-types";
import type { PublicationKind } from "@/features/publications/contracts";
import { useTRPC } from "@/trpc/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: PublicationSource[];
  sourceKey: string | null;
  isLoading: boolean;
  error: { message: string } | null;
  onRetry: () => void;
  onCreated: (id: string) => void;
  onOpenTarget: (id: string) => void;
};

export function PublicationCreateDialog({
  open,
  onOpenChange,
  sources,
  sourceKey,
  isLoading,
  error,
  onRetry,
  onCreated,
  onOpenTarget,
}: Props): React.JSX.Element {
  const trpc = useTRPC();
  const [kind, setKind] = React.useState<PublicationKind | "ALL">("ALL");
  const [query, setQuery] = React.useState("");
  const create = useMutation(trpc.publications.create.mutationOptions());

  React.useEffect(() => {
    if (!open || !sourceKey) return;
    const matchingSource = sources.find(
      (source) => source.sourceKey === sourceKey,
    );
    if (matchingSource) setKind(matchingSource.kind);
  }, [open, sourceKey, sources]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSources = sources
    .filter((source) => kind === "ALL" || source.kind === kind)
    .filter(
      (source) =>
        !normalizedQuery ||
        source.name.toLowerCase().includes(normalizedQuery) ||
        KIND_LABELS[source.kind].toLowerCase().includes(normalizedQuery),
    )
    .sort((left, right) => {
      if (left.sourceKey === sourceKey) return -1;
      if (right.sourceKey === sourceKey) return 1;
      return left.name.localeCompare(right.name);
    });

  async function handleCreate(source: PublicationSource): Promise<void> {
    try {
      const target = await create.mutateAsync(createInputForSource(source));
      toast.success("Publication target created");
      onOpenChange(false);
      onCreated(target.id);
    } catch (error: unknown) {
      toast.error("Could not create publication target", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b p-5">
          <DialogTitle>Create publication target</DialogTitle>
          <DialogDescription>
            Select an existing source. Aurea will manage its draft, domain, and
            immutable published versions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search publication sources"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sources"
              className="h-8 pl-9 text-xs"
            />
          </div>
          <Select
            value={kind}
            onValueChange={(value) => setKind(value as PublicationKind | "ALL")}
          >
            <SelectTrigger size="sm" aria-label="Filter source type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All source types</SelectItem>
              {PUBLICATION_KINDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {KIND_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="h-[min(55vh,480px)]">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertCircle className="size-5 text-destructive" />
              <p className="text-sm font-medium">
                Source inventory unavailable
              </p>
              <p className="text-xs text-destructive">{error.message}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : visibleSources.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center">
              <FilePlus2 className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">No matching sources</p>
              <p className="text-xs text-muted-foreground">
                Create the underlying resource first, then return here.
              </p>
            </div>
          ) : (
            visibleSources.map((source) => (
              <PublicationSourceRow
                key={`${source.kind}:${source.sourceKey}`}
                source={source}
                isCreating={create.isPending}
                onCreate={(row) => void handleCreate(row)}
                onOpenTarget={onOpenTarget}
              />
            ))
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
