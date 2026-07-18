"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppRouter } from "@/trpc/routers/_app";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import {
  useCreateWorkflowFolder,
  useDeleteWorkflowFolder,
  useUpdateWorkflowFolder,
  useWorkflowFolders,
} from "../hooks/use-workflows";
import { WorkflowFolderCard } from "./workflow-folder-card";
import {
  WORKFLOW_FOLDER_COLORS,
  WorkflowFolderDialog,
} from "./workflow-folder-dialog";

export type WorkflowFolder =
  inferRouterOutputs<AppRouter>["workflows"]["getFolders"]["folders"][number];

export function WorkflowFolders() {
  const foldersQuery = useWorkflowFolders();
  const createFolder = useCreateWorkflowFolder();
  const updateFolder = useUpdateWorkflowFolder();
  const deleteFolder = useDeleteWorkflowFolder();
  const [params, setParams] = useWorkflowsParams();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingFolder, setEditingFolder] = React.useState<WorkflowFolder | null>(null);
  const data = foldersQuery.data ?? { folders: [], unfiledCount: 0 };
  const activeFolder = params.folder;
  const currentFolder = data.folders.find((folder) => folder.id === activeFolder);
  const initialColor =
    WORKFLOW_FOLDER_COLORS[data.folders.length % WORKFLOW_FOLDER_COLORS.length] ??
    WORKFLOW_FOLDER_COLORS[0];

  const selectFolder = (folder: string) => setParams({ folder, page: 1 });
  const openCreateDialog = () => {
    setEditingFolder(null);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-primary">Workflow folders</p>
            <p className="text-xs text-primary/50">
              Separate automation flows by client, channel, or handoff stage.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-max gap-1.5 text-xs"
            onClick={openCreateDialog}
          >
            <PlusIcon className="size-3.5" />
            New folder
          </Button>
        </div>
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <div className="flex min-w-max items-stretch gap-3">
            <WorkflowFolderCard
              active={activeFolder === "all"}
              label="All workflows"
              count={data.folders.reduce(
                (total, folder) => total + folder.activeWorkflowCount,
                data.unfiledCount,
              )}
              color="#111827"
              description="Every active automation"
              onClick={() => selectFolder("all")}
            />
            <WorkflowFolderCard
              active={activeFolder === "unfiled"}
              label="Unfiled"
              count={data.unfiledCount}
              color="#64748b"
              description="Needs organizing"
              onClick={() => selectFolder("unfiled")}
            />
            {data.folders.map((folder) => (
              <div key={folder.id} className="group/folder relative">
                <WorkflowFolderCard
                  active={activeFolder === folder.id}
                  label={folder.name}
                  count={folder.activeWorkflowCount}
                  color={folder.color}
                  description={folder.description ?? "Workflow folder"}
                  onClick={() => selectFolder(folder.id)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="absolute right-3 top-3 bg-background/90 opacity-0 shadow-sm ring-1 ring-black/10 group-hover/folder:opacity-100"
                      aria-label={`Manage ${folder.name}`}
                    >
                      <MoreHorizontalIcon className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingFolder(folder);
                        setDialogOpen(true);
                      }}
                    >
                      <PencilIcon className="mr-2 size-3.5" />
                      Rename folder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-rose-600 focus:text-rose-700"
                      onClick={() =>
                        deleteFolder.mutate(
                          { id: folder.id },
                          {
                            onSuccess: () => {
                              if (activeFolder === folder.id) selectFolder("all");
                            },
                          },
                        )
                      }
                    >
                      <Trash2Icon className="mr-2 size-3.5" />
                      Delete folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
        {currentFolder ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-background px-4 py-3 shadow-sm dark:border-white/10">
            <div className="min-w-0">
              <p className="text-[11px] text-primary/45">Active folder</p>
              <p className="mt-0.5 truncate text-sm font-medium text-primary">
                {currentFolder.name}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => selectFolder("all")}>
              Back to all workflows
            </Button>
          </div>
        ) : null}
      </div>
      <WorkflowFolderDialog
        folder={editingFolder}
        initialColor={initialColor}
        open={dialogOpen}
        pending={createFolder.isPending || updateFolder.isPending}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => {
          if (editingFolder) {
            updateFolder.mutate(
              { id: editingFolder.id, ...values },
              { onSuccess: () => setDialogOpen(false) },
            );
          } else {
            createFolder.mutate(values, {
              onSuccess: () => setDialogOpen(false),
            });
          }
        }}
      />
    </>
  );
}
