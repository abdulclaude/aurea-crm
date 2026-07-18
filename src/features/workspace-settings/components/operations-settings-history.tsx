"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import type { OperationsSettingsHistoryItem } from "@/features/workspace-settings/server/operations-model";
import { useTRPC } from "@/trpc/client";

import { SettingsVersionHistory } from "./settings-version-history";

export function OperationsSettingsHistory(props: {
  history: OperationsSettingsHistoryItem[];
  canManage: boolean;
  onRolledBack: () => Promise<unknown>;
}): React.JSX.Element {
  const trpc = useTRPC();
  const rollback = useMutation(
    trpc.workspaceSettings.rollbackOperationsSettings.mutationOptions(),
  );
  const restore = async (version: number): Promise<void> => {
    try {
      await rollback.mutateAsync({
        targetVersion: version,
        expectedVersion:
          props.history.find((item) => item.isActive)?.version ?? null,
        changeNote: null,
      });
      await props.onRolledBack();
      toast.success(`Operations version ${version} restored as a new version`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to restore this version",
      );
    }
  };

  return (
    <SettingsVersionHistory
      domainLabel="operations settings"
      emptyLabel="Publish operations settings to create the first version."
      history={props.history}
      canManage={props.canManage}
      isPending={rollback.isPending}
      onRestore={restore}
    />
  );
}
