"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { ReportViewDefinition } from "@/features/reports/contracts";
import type { ReportGroupId } from "@/features/reports/types";
import { useTRPC } from "@/trpc/client";

import { SavedReportViewDialog } from "./saved-report-view-dialog";
import { SavedReportViewsMenu } from "./saved-report-views-menu";

type SavedReportViewsControlProps = {
  activeViewId: string | null;
  canManage: boolean;
  currentDefinition: ReportViewDefinition;
  groupId: ReportGroupId;
  onApply: (id: string, definition: ReportViewDefinition) => void;
  reportId: string;
};

export function SavedReportViewsControl(props: SavedReportViewsControlProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createNew, setCreateNew] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"PERSONAL" | "LOCATION">(
    "PERSONAL",
  );
  const views = useQuery(
    trpc.reportFoundation.listViews.queryOptions({
      groupId: props.groupId,
      reportId: props.reportId,
    }),
  );
  const active =
    views.data?.find((view) => view.id === props.activeViewId) ?? null;

  useEffect(() => {
    if (!dialogOpen) return;
    setName(createNew ? "" : (active?.name ?? ""));
    setVisibility(createNew ? "PERSONAL" : (active?.visibility ?? "PERSONAL"));
  }, [active, createNew, dialogOpen]);

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: trpc.reportFoundation.listViews.queryKey({
        groupId: props.groupId,
        reportId: props.reportId,
      }),
    });
  };
  const createView = useMutation(
    trpc.reportFoundation.createView.mutationOptions({
      onSuccess: async (result) => {
        await refresh();
        props.onApply(result.id, props.currentDefinition);
        setDialogOpen(false);
        toast.success("Report view saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateView = useMutation(
    trpc.reportFoundation.updateView.mutationOptions({
      onSuccess: async () => {
        await refresh();
        setDialogOpen(false);
        toast.success("Report view updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const archiveView = useMutation(
    trpc.reportFoundation.archiveView.mutationOptions({
      onSuccess: async () => {
        await refresh();
        setDialogOpen(false);
        toast.success("Report view archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const pending =
    createView.isPending || updateView.isPending || archiveView.isPending;

  const save = () => {
    const input = {
      groupId: props.groupId,
      reportId: props.reportId,
      name,
      visibility,
      definition: props.currentDefinition,
    };
    if (active && !createNew) updateView.mutate({ ...input, id: active.id });
    else createView.mutate(input);
  };

  return (
    <>
      <SavedReportViewsMenu
        activeName={active?.name ?? null}
        canManage={props.canManage}
        onApply={props.onApply}
        onCreateNew={() => {
          setCreateNew(true);
          setDialogOpen(true);
        }}
        onSave={() => {
          setCreateNew(!active);
          setDialogOpen(true);
        }}
        views={views.data ?? []}
      />

      <SavedReportViewDialog
        editing={Boolean(active && !createNew)}
        name={name}
        onArchive={() => {
          if (active) archiveView.mutate({ id: active.id });
        }}
        onNameChange={setName}
        onOpenChange={setDialogOpen}
        onSave={save}
        onVisibilityChange={setVisibility}
        open={dialogOpen}
        pending={pending}
        visibility={visibility}
      />
    </>
  );
}
