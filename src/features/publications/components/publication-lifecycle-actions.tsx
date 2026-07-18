"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CirclePause, Rocket, ShieldAlert } from "lucide-react";
import * as React from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicationTarget } from "@/features/publications/components/publication-ui-types";
import { useTRPC } from "@/trpc/client";

type Props = {
  target: PublicationTarget;
  onChanged: () => Promise<void>;
};

export function PublicationLifecycleActions({
  target,
  onChanged,
}: Props): React.JSX.Element {
  const trpc = useTRPC();
  const [changeNote, setChangeNote] = React.useState("");
  const parity = useQuery(
    trpc.publications.parity.queryOptions({ id: target.id }),
  );
  const publish = useMutation(trpc.publications.publish.mutationOptions());
  const pause = useMutation(trpc.publications.pause.mutationOptions());

  async function handlePublish(): Promise<void> {
    try {
      const result = await publish.mutateAsync({
        id: target.id,
        changeNote: changeNote.trim() || null,
      });
      setChangeNote("");
      await onChanged();
      toast.success(`Version ${result.version} published`);
    } catch (error: unknown) {
      toast.error("Could not publish target", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handlePause(): Promise<void> {
    try {
      await pause.mutateAsync({ id: target.id });
      await onChanged();
      toast.success("Publication paused");
    } catch (error: unknown) {
      toast.error("Could not pause target", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const isUnchangedPublished =
    target.status === "PUBLISHED" && parity.data?.matchesPublished === true;
  const isPublishBlocked =
    parity.isLoading ||
    Boolean(parity.error) ||
    parity.data?.publishable === false ||
    Boolean(parity.data?.errors.length) ||
    isUnchangedPublished;

  return (
    <div className="border-b px-5 py-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          {parity.isLoading ? (
            <p className="text-xs text-muted-foreground">
              Checking draft parity...
            </p>
          ) : parity.error ? (
            <p className="text-xs text-destructive">{parity.error.message}</p>
          ) : parity.data?.matchesPublished ? (
            <Badge variant="outline">Draft matches published version</Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              Draft has unpublished changes
            </Badge>
          )}
          {parity.data?.errors[0] ? (
            <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 size-3 shrink-0" />
              {parity.data.errors[0]}
            </p>
          ) : null}
          {parity.data?.warnings[0] ? (
            <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              {parity.data.warnings[0]}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {target.status === "PUBLISHED" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <CirclePause aria-hidden="true" />
                  Pause
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Pause this public target?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The current immutable version is retained, but public access
                    is stopped until the target is published again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handlePause()}
                    disabled={pause.isPending}
                  >
                    Pause target
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={isPublishBlocked}>
                <Rocket aria-hidden="true" />
                {target.status === "PAUSED"
                  ? "Publish again"
                  : target.publishedVersionId
                    ? "Publish changes"
                    : "Publish"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Publish an immutable version?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Aurea will validate the current source and promote a snapshot.
                  Later draft edits will not change this version.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="publication-change-note">Change note</Label>
                <Textarea
                  id="publication-change-note"
                  value={changeNote}
                  onChange={(event) => setChangeNote(event.target.value)}
                  maxLength={500}
                  placeholder="Optional context for this version"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handlePublish()}
                  disabled={publish.isPending}
                >
                  Publish version
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
