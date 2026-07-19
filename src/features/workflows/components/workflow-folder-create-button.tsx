"use client";

import { PlusIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  useCreateWorkflowFolder,
  useWorkflowFolders,
} from "../hooks/use-workflows";

import {
  WORKFLOW_FOLDER_COLORS,
  WorkflowFolderDialog,
} from "./workflow-folder-dialog";

export function WorkflowFolderCreateButton(): React.JSX.Element {
  const foldersQuery = useWorkflowFolders();
  const createFolder = useCreateWorkflowFolder();
  const [open, setOpen] = React.useState(false);
  const folderCount = foldersQuery.data?.folders.length ?? 0;
  const initialColor =
    WORKFLOW_FOLDER_COLORS[folderCount % WORKFLOW_FOLDER_COLORS.length] ??
    WORKFLOW_FOLDER_COLORS[0];

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8.5 w-max gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="size-3.5" />
        New folder
      </Button>
      <WorkflowFolderDialog
        folder={null}
        initialColor={initialColor}
        open={open}
        pending={createFolder.isPending}
        onOpenChange={setOpen}
        onSubmit={(values) =>
          createFolder.mutate(values, {
            onSuccess: () => setOpen(false),
          })
        }
      />
    </>
  );
}
