"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Archive, Eye, Pencil, Plus, RotateCcw, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AudienceEditorDialog } from "@/features/audiences/components/audience-editor-dialog";
import { countAudienceFilters } from "@/features/audiences/lib/audience-definition";
import type { SavedAudienceRow } from "@/features/audiences/types";
import { useTRPC } from "@/trpc/client";

type SavedAudiencesPanelProps = {
  canManage: boolean;
};

export function SavedAudiencesPanel({ canManage }: SavedAudiencesPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<SavedAudienceRow | null>(null);
  const queryInput = { search: deferredSearch, includeArchived };
  const { data: audiences } = useSuspenseQuery(
    trpc.savedAudiences.list.queryOptions(queryInput),
  );

  const invalidate = React.useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: trpc.savedAudiences.list.queryKey(),
    });
  }, [queryClient, trpc.savedAudiences.list]);
  const archiveAudience = useMutation(
    trpc.savedAudiences.archive.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Audience archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const restoreAudience = useMutation(
    trpc.savedAudiences.restore.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Audience restored");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function openAudience(audience: SavedAudienceRow): void {
    setSelected(audience);
    setEditorOpen(true);
  }

  function createAudience(): void {
    setSelected(null);
    setEditorOpen(true);
  }

  return (
    <div className="min-h-[420px]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Input
            value={search}
            className="h-8 max-w-sm text-xs"
            placeholder="Search saved audiences"
            aria-label="Search saved audiences"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Label className="flex items-center gap-2 text-xs font-normal text-primary/65">
            <Switch
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
            Show archived
          </Label>
        </div>
        {canManage ? (
          <Button size="sm" variant="outline" onClick={createAudience}>
            <Plus className="size-3.5" /> New audience
          </Button>
        ) : null}
      </div>

      {audiences.length === 0 ? (
        <Empty className="rounded-none border-y border-black/5 dark:border-white/5">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>No saved audiences</EmptyTitle>
            <EmptyDescription>
              Save reusable customer filters for campaigns, reporting, and daily work.
            </EmptyDescription>
          </EmptyHeader>
          {canManage ? (
            <Button size="sm" onClick={createAudience}>
              <Plus className="size-3.5" /> Create audience
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="border-y border-black/5 dark:border-white/5">
          <Table>
            <TableHeader>
              <TableRow className="border-black/5 dark:border-white/5">
                <TableHead className="h-9 px-6 text-xs text-primary/60">Audience</TableHead>
                <TableHead className="h-9 text-xs text-primary/60">Definition</TableHead>
                <TableHead className="h-9 text-xs text-primary/60">Owner</TableHead>
                <TableHead className="h-9 text-xs text-primary/60">Updated</TableHead>
                <TableHead className="h-9 w-28 pr-6 text-right text-xs text-primary/60">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audiences.map((audience) => {
                const filterCount = countAudienceFilters(audience.definition);
                return (
                  <TableRow
                    key={audience.id}
                    className="border-black/5 dark:border-white/5"
                  >
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs font-medium text-primary">{audience.name}</p>
                          <p className="max-w-md truncate text-[11px] text-primary/55">
                            {audience.description ?? "No description"}
                          </p>
                        </div>
                        {audience.archivedAt ? <Badge variant="outline">Archived</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-primary/70">
                      {filterCount === 0 ? "All customers" : `${filterCount} active ${filterCount === 1 ? "filter" : "filters"}`}
                    </TableCell>
                    <TableCell className="text-xs text-primary/70">
                      {audience.createdByName ?? "Former team member"}
                    </TableCell>
                    <TableCell className="text-xs text-primary/70">
                      {formatDistanceToNow(audience.updatedAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={canManage ? "Edit audience" : "View audience"}
                          aria-label={canManage ? "Edit audience" : "View audience"}
                          onClick={() => openAudience(audience)}
                        >
                          {canManage ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
                        </Button>
                        {canManage ? (
                          audience.archivedAt ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Restore audience"
                              aria-label="Restore audience"
                              onClick={() => restoreAudience.mutate({ id: audience.id })}
                            >
                              <RotateCcw className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Archive audience"
                              aria-label="Archive audience"
                              onClick={() => archiveAudience.mutate({ id: audience.id })}
                            >
                              <Archive className="size-3.5" />
                            </Button>
                          )
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AudienceEditorDialog
        audience={selected}
        open={editorOpen}
        canManage={canManage}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}
