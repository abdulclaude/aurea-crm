"use client";

import { RotateCcw } from "lucide-react";

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

type SettingsVersionHistoryItem = {
  id: string;
  version: number;
  isActive: boolean;
  isRollback: boolean;
  changeNote: string | null;
  createdAt: Date;
  actor: { name: string; email: string } | null;
};

export function SettingsVersionHistory(props: {
  domainLabel: string;
  emptyLabel: string;
  history: SettingsVersionHistoryItem[];
  canManage: boolean;
  isPending: boolean;
  onRestore: (version: number) => Promise<void>;
}): React.JSX.Element {
  if (props.history.length === 0) {
    return (
      <div className="max-w-3xl py-12 text-center text-xs text-primary/60">
        {props.emptyLabel}
      </div>
    );
  }

  return (
    <div className="max-w-4xl divide-y divide-black/5 dark:divide-white/5">
      {props.history.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Version {item.version}</p>
              {item.isActive ? <Badge>Current</Badge> : null}
              {item.isRollback ? (
                <Badge variant="secondary">Rollback</Badge>
              ) : null}
            </div>
            <p className="text-xs text-primary/65">
              {item.changeNote || "No change note"}
            </p>
            <p className="text-[11px] text-primary/50">
              {item.actor?.name ?? "System"} ·{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(item.createdAt))}
            </p>
          </div>
          {props.canManage && !item.isActive ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={props.isPending}
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  Restore
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Restore version {item.version}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This publishes the selected {props.domainLabel} values as a
                    new version. Existing history is preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => props.onRestore(item.version)}
                  >
                    Restore version
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      ))}
    </div>
  );
}
