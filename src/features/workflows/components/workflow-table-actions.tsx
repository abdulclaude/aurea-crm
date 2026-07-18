"use client";

import {
  ArchiveIcon,
  FolderIcon,
  FolderOpenIcon,
  Layers3Icon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateTemplateFromWorkflow,
  useMoveWorkflowToFolder,
  useRemoveWorkflow,
  useUpdateWorkflowArchived,
} from "../hooks/use-workflows";
import type { WorkflowFolder } from "./workflow-folders";
import type {
  WorkflowTableMode,
  WorkflowTableRow,
} from "./workflow-table-types";

type WorkflowTableActionsProps = {
  row: WorkflowTableRow;
  mode: WorkflowTableMode;
  folders: WorkflowFolder[];
};

export function WorkflowTableActions({
  row,
  mode,
  folders,
}: WorkflowTableActionsProps) {
  const router = useRouter();
  const archiveWorkflow = useUpdateWorkflowArchived();
  const createTemplate = useCreateTemplateFromWorkflow();
  const moveWorkflow = useMoveWorkflowToFolder();
  const removeWorkflow = useRemoveWorkflow();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${row.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onSelect={() => router.push(`/workflows/${row.id}`)}
          >
            <PencilIcon className="mr-2 size-3.5" />
            {mode === "archived" ? "Review and activate" : "Edit workflow"}
          </DropdownMenuItem>

          {mode === "active" ? (
            <>
              <DropdownMenuItem
                disabled={createTemplate.isPending}
                onSelect={() => createTemplate.mutate({ id: row.id })}
              >
                <Layers3Icon className="mr-2 size-3.5" />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderIcon className="mr-2 size-3.5" />
                  Move to folder
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {row.folderId ? (
                    <DropdownMenuItem
                      onSelect={() =>
                        moveWorkflow.mutate({
                          workflowId: row.id,
                          folderId: null,
                        })
                      }
                    >
                      <FolderOpenIcon className="mr-2 size-3.5" />
                      Unfiled
                    </DropdownMenuItem>
                  ) : null}
                  {folders.map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      disabled={folder.id === row.folderId}
                      onSelect={() =>
                        moveWorkflow.mutate({
                          workflowId: row.id,
                          folderId: folder.id,
                        })
                      }
                    >
                      <FolderIcon
                        className="mr-2 size-3.5"
                        style={
                          folder.color ? { color: folder.color } : undefined
                        }
                      />
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={archiveWorkflow.isPending}
                onSelect={() =>
                  archiveWorkflow.mutate({ id: row.id, archived: true })
                }
              >
                <ArchiveIcon className="mr-2 size-3.5" />
                Archive workflow
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-700"
                onSelect={() => setConfirmDeleteOpen(true)}
              >
                <Trash2Icon className="mr-2 size-3.5" />
                Delete permanently
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this workflow permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes {row.name} and its execution graph. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeWorkflow.isPending}
              onClick={() =>
                removeWorkflow.mutate(
                  { id: row.id },
                  { onSuccess: () => setConfirmDeleteOpen(false) },
                )
              }
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
