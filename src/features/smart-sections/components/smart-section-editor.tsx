"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import {
  ArrowLeft,
  Save,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { DeviceType } from "@prisma/client";
import {
  deviceModeAtom,
  activePageIdAtom,
  selectedBlockIdAtom,
} from "@/features/funnel-builder/lib/editor-store";
import { EditorCanvas } from "@/features/funnel-builder/components/editor/editor-canvas";
import { RightSidebar } from "@/features/funnel-builder/components/editor/right-sidebar";
import { BlocksPanel } from "@/features/funnel-builder/components/editor/panels/blocks-panel";
import { useKeyboardShortcuts } from "@/features/funnel-builder/hooks/use-keyboard-shortcuts";
import { Badge } from "@/components/ui/badge";

interface SmartSectionEditorProps {
  sectionId: string;
}

export function SmartSectionEditor({ sectionId }: SmartSectionEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [deviceMode, setDeviceMode] = useAtom(deviceModeAtom);
  const [activePageId, setActivePageId] = useAtom(activePageIdAtom);
  const [selectedBlockId, setSelectedBlockId] = useAtom(selectedBlockIdAtom);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);

  // Set the active "page" to the section ID with a prefix to indicate it's a smart section
  // This helps the blocks panel know to use smartSectionId instead of pageId
  useEffect(() => {
    setActivePageId(`smart-section:${sectionId}`);
  }, [sectionId, setActivePageId]);

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

  // Enable keyboard shortcuts
  useKeyboardShortcuts(activePageId ?? undefined, undefined, handleRequestDelete);

  // Fetch section data
  const { data: section, isLoading: sectionLoading } = useQuery({
    ...trpc.smartSections.get.queryOptions({ id: sectionId }),
  });

  // Fetch blocks for this section
  const { data: blocks, isLoading: blocksLoading } = useQuery({
    ...trpc.smartSections.getBlocks.queryOptions({ sectionId }),
  });

  // Update section mutation
  const { mutate: updateSection, isPending: isUpdating } = useMutation(
    trpc.smartSections.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Section saved");
      },
      onError: (error) => {
        toast.error("Failed to save section", {
          description: error.message,
        });
      },
    })
  );

  // Delete section mutation
  const { mutate: deleteSection } = useMutation(
    trpc.smartSections.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Section deleted");
        router.push("/builder/library");
      },
      onError: (error) => {
        toast.error("Failed to delete section", {
          description: error.message,
        });
      },
    })
  );

  const deviceIcons = {
    [DeviceType.DESKTOP]: Monitor,
    [DeviceType.TABLET]: Tablet,
    [DeviceType.MOBILE]: Smartphone,
  };

  const DeviceIcon = deviceIcons[deviceMode];

  if (sectionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading section...</p>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Section not found</p>
      </div>
    );
  }

  // Create a virtual page object that matches the FunnelPage structure
  // This allows us to reuse the EditorCanvas component
  const virtualPage = {
    id: sectionId,
    name: section.name,
    slug: section.name.toLowerCase().replace(/\s+/g, "-"),
    order: 0,
    funnelId: "smart-section", // Fake funnel ID
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
    blocks: blocks || [],
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top Bar */}
      <div className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/builder/library")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-3">
            <Input
              value={section.name}
              onChange={(e) => {
                updateSection({
                  id: sectionId,
                  name: e.target.value,
                });
              }}
              className="h-8 w-64 border-none text-sm font-semibold focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {section.category || "Uncategorized"}
              </Badge>
              <span>•</span>
              <span>{section.usageCount} uses</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Mode Selector */}
          <TooltipProvider>
            <div className="flex items-center gap-1 rounded-md border p-1">
              {Object.entries(deviceIcons).map(([mode, Icon]) => (
                <Tooltip key={mode}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={deviceMode === mode ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeviceMode(mode as DeviceType)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {mode.charAt(0) + mode.slice(1).toLowerCase()}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteSection({ id: sectionId })}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>

          <Button size="sm" disabled>
            <Save className="mr-2 h-4 w-4" />
            Auto-saved
          </Button>
        </div>
      </div>

      {/* Main Editor Area - Reuse funnel editor components */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Blocks Panel */}
        <div className="w-80 border-r bg-muted/10">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold">Add Blocks</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Drag or click blocks to add them to your section
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <BlocksPanel />
            </div>
          </div>
        </div>

        {/* Canvas - Reuse the funnel editor canvas */}
        <EditorCanvas
          page={virtualPage as any}
          isLoading={blocksLoading}
          deviceMode={deviceMode}
        />

        {/* Right Sidebar - Properties Panel */}
        <RightSidebar page={virtualPage as any} />
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
