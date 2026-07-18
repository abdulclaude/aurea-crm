"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  Layers3Icon,
  MoreHorizontalIcon,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateTemplateFromWorkflow,
  useSuspenseWorkflow,
  useUpdateWorkflow,
  useUpdateWorkflowArchived,
} from "@/features/workflows/hooks/use-workflows";
import { editorAtom } from "../store/atoms";

export function WorkflowStateActions({ workflowId }: { workflowId: string }) {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  const updateArchived = useUpdateWorkflowArchived();
  const saveWorkflow = useUpdateWorkflow();
  const createTemplate = useCreateTemplateFromWorkflow();
  const editor = useAtomValue(editorAtom);
  const [hasNewTemplate, setHasNewTemplate] = useState(false);

  const isArchived = workflow.archived ?? false;
  const templated = (workflow.isTemplate ?? false) || hasNewTemplate;

  const handleArchive = () => {
    if (!isArchived) {
      updateArchived.mutate({ id: workflowId, archived: true });
    }
  };

  const handleActivate = async () => {
    if (!editor || workflow.isTemplate) return;
    try {
      await saveWorkflow.mutateAsync({
        id: workflowId,
        nodes: editor.getNodes(),
        edges: editor.getEdges(),
      });
      await updateArchived.mutateAsync({
        id: workflowId,
        archived: false,
        confirmedReviewed: true,
      });
    } catch {
      // Mutation hooks surface the server error to the user.
    }
  };

  const handleTemplate = () => {
    if (!templated) {
      createTemplate.mutate(
        { id: workflowId },
        { onSuccess: () => setHasNewTemplate(true) },
      );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isArchived && !workflow.isTemplate ? (
        <>
          <Badge className="h-7 cursor-default rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 text-[10px] text-sky-700 dark:text-sky-300">
            Inactive
          </Badge>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-max gap-1.5 rounded-lg text-xs"
                disabled={saveWorkflow.isPending || updateArchived.isPending}
              >
                <ArchiveRestoreIcon className="size-3.5" />
                Activate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate this workflow?</AlertDialogTitle>
                <AlertDialogDescription>
                  Confirm that every action, recipient, provider account, and
                  trigger has been reviewed for this workspace. Activation can
                  create provider subscriptions and process future events.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={saveWorkflow.isPending || updateArchived.isPending}
                  onClick={() => void handleActivate()}
                >
                  Confirm activation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
      {templated ? (
        <Badge className="h-7 cursor-default rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-[10px] text-emerald-700 dark:text-emerald-300">
          Templated
        </Badge>
      ) : null}
      {!templated || !isArchived ? <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-lg"
            aria-label="Workflow actions"
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {!templated ? (
            <DropdownMenuItem
              className="text-xs"
              disabled={createTemplate.isPending}
              onClick={handleTemplate}
            >
              <Layers3Icon className="mr-1.5 size-3.5" />
              Save as template
            </DropdownMenuItem>
          ) : null}
          {!isArchived ? (
            <DropdownMenuItem
              className="text-xs"
              disabled={updateArchived.isPending}
              onClick={handleArchive}
            >
              <ArchiveIcon className="mr-1.5 size-3.5" />
              Archive workflow
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu> : null}
    </div>
  );
}
