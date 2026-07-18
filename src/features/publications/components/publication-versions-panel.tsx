"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPublicationDate,
  type PublicationTarget,
  type PublicationVersion,
} from "@/features/publications/components/publication-ui-types";
import { useTRPC } from "@/trpc/client";

type Props = {
  target: PublicationTarget;
  onChanged: () => Promise<void>;
};

function VersionRow({
  version,
  isCurrent,
  isPending,
  onRollback,
}: {
  version: PublicationVersion;
  isCurrent: boolean;
  isPending: boolean;
  onRollback: (version: PublicationVersion) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Version {version.version}</p>
          {isCurrent ? <Badge variant="outline">Current</Badge> : null}
          {version.isRollback ? (
            <Badge variant="secondary">Rollback</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatPublicationDate(version.createdAt)} ·{" "}
          {version.contentHash.slice(0, 12)}
        </p>
        {version.changeNote ? (
          <p className="mt-1 text-xs">{version.changeNote}</p>
        ) : null}
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isCurrent || isPending}>
            <RotateCcw aria-hidden="true" />
            Restore
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restore version {version.version}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Aurea will create a new immutable rollback version from this
              snapshot. Existing history will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRollback(version)}>
              Restore as new version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PublicationVersionsPanel({
  target,
  onChanged,
}: Props): React.JSX.Element {
  const trpc = useTRPC();
  const versions = useQuery(
    trpc.publications.versions.queryOptions({ id: target.id }),
  );
  const rollback = useMutation(trpc.publications.rollback.mutationOptions());

  async function handleRollback(version: PublicationVersion): Promise<void> {
    try {
      const result = await rollback.mutateAsync({
        id: target.id,
        versionId: version.id,
        changeNote: null,
      });
      await onChanged();
      toast.success(`Version ${result.version} published from rollback`);
    } catch (error: unknown) {
      toast.error("Could not restore version", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (versions.isLoading) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (versions.error) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Version history unavailable</p>
        <p className="text-xs text-destructive">{versions.error.message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void versions.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!versions.data?.length) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
        <History aria-hidden="true" className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">No published versions</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          The first successful publish creates immutable version history.
        </p>
      </div>
    );
  }

  return (
    <div>
      {versions.data.map((version) => (
        <VersionRow
          key={version.id}
          version={version}
          isCurrent={version.id === target.publishedVersionId}
          isPending={rollback.isPending}
          onRollback={(row) => void handleRollback(row)}
        />
      ))}
    </div>
  );
}
