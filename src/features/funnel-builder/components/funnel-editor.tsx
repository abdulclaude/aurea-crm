"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Settings,
  Undo,
  Redo,
} from "lucide-react";
import { DeviceType } from "@prisma/client";
import {
  deviceModeAtom,
  activePageIdAtom,
  activeSidebarAtom,
} from "../lib/editor-store";
import { LeftSidebar } from "./editor/left-sidebar";
import { EditorCanvas } from "./editor/editor-canvas";
import { RightSidebar } from "./editor/right-sidebar";
import { EditorTopBar } from "./editor/editor-top-bar";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { selectedBlockIdAtom } from "../lib/editor-store";
import { toast } from "sonner";

interface FunnelEditorProps {
  funnelId: string;
  initialPageId?: string;
}

export function FunnelEditor({ funnelId, initialPageId }: FunnelEditorProps) {
  const router = useRouter();
  const [deviceMode, setDeviceMode] = useAtom(deviceModeAtom);
  const [activePageId, setActivePageId] = useAtom(activePageIdAtom);
  const [activeSidebar] = useAtom(activeSidebarAtom);
  const [selectedBlockId, setSelectedBlockId] = useAtom(selectedBlockIdAtom);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Delete block mutation
  const { mutate: deleteBlock, isPending: isDeleting } = useMutation(
    trpc.funnels.deleteBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Block deleted");
        setSelectedBlockId(null);
        setDeleteDialogOpen(false);
        setBlockToDelete(null);
      },
      onError: (error) => {
        toast.error("Failed to delete block", {
          description: error.message,
        });
      },
    })
  );

  // Handler for delete confirmation
  const handleRequestDelete = (blockId: string) => {
    setBlockToDelete(blockId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (blockToDelete) {
      deleteBlock({ blockId: blockToDelete });
    }
  };

  // Enable keyboard shortcuts (D, Delete, G, A, Escape, Cmd+Z)
  useKeyboardShortcuts(activePageId ?? undefined, undefined, handleRequestDelete);

  // Fetch funnel data
  const { data: funnel, isLoading: funnelLoading } = useQuery(
    trpc.funnels.getById.queryOptions({
      id: funnelId,
    })
  );

  // Fetch current page data
  const { data: page, isLoading: pageLoading } = useQuery({
    ...trpc.funnels.getPage.queryOptions({
      pageId: activePageId ?? "",
    }),
    enabled: !!activePageId,
  });

  // Initialize active page
  useEffect(() => {
    if (!funnel) return;

    // If initialPageId is provided, use that
    if (initialPageId) {
      setActivePageId(initialPageId);
      return;
    }

    // Otherwise, use the first page
    if (funnel.funnelPage.length > 0 && !activePageId) {
      setActivePageId(funnel.funnelPage[0].id);
    }
  }, [funnel, initialPageId, activePageId, setActivePageId]);

  // Update URL when page changes
  useEffect(() => {
    if (activePageId && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("pageId", activePageId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [activePageId]);

  const deviceIcons = {
    [DeviceType.DESKTOP]: Monitor,
    [DeviceType.TABLET]: Tablet,
    [DeviceType.MOBILE]: Smartphone,
  };

  const DeviceIcon = deviceIcons[deviceMode];

  if (funnelLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading funnel...</p>
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Funnel Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The funnel you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/funnels")}>
            Back to Funnels
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/funnels")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to Funnels</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div>
            <h1 className="text-lg font-semibold">{funnel.name}</h1>
            <p className="text-xs text-muted-foreground">
              {page?.name || "Select a page"}
            </p>
          </div>
        </div>

        {/* Device Preview Toggle */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <div className="flex items-center gap-1 rounded-md border p-1">
              {Object.values(DeviceType).map((device) => {
                const Icon = deviceIcons[device];
                return (
                  <Tooltip key={device}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={deviceMode === device ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeviceMode(device)}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {device.charAt(0) + device.slice(1).toLowerCase()} View
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-8" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Coming Soon)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Coming Soon)</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Preview & Settings */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (page) {
                      const previewUrl = `/preview/f/${funnelId}/${page.slug}`;
                      window.open(previewUrl, "_blank");
                    }
                  }}
                  disabled={!page}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {page ? "Preview this page in a new tab" : "Select a page to preview"}
              </TooltipContent>
            </Tooltip>

            <EditorTopBar funnel={funnel} />
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar funnelId={funnelId} funnel={funnel as any} />

        {/* Canvas */}
        <EditorCanvas
          page={page as any}
          isLoading={pageLoading}
          deviceMode={deviceMode}
        />

        {/* Right Sidebar - Properties Panel */}
        <RightSidebar page={page as any} />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this block? This action cannot be undone and all child blocks will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
