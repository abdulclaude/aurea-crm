"use client";

import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeviceType, FunnelBlockType } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  selectedBlockIdAtom,
  hoveredBlockIdAtom,
  hiddenBlockIdsAtom,
  activePageIdAtom,
  showGridAtom,
  gridSizeAtom,
} from "../../lib/editor-store";
import { BlockRenderer } from "./block-renderer";
import { getBlockDefinition } from "../../lib/block-registry";
import type { FunnelPage, FunnelBlock, FunnelBreakpoint } from "@prisma/client";
import { useState } from "react";

interface EditorCanvasProps {
  page:
    | (FunnelPage & {
        blocks: (FunnelBlock & { breakpoints: FunnelBreakpoint[] })[];
      })
    | null
    | undefined;
  isLoading: boolean;
  deviceMode: DeviceType;
}

export function EditorCanvas({ page, isLoading, deviceMode }: EditorCanvasProps) {
  const [selectedBlockId] = useAtom(selectedBlockIdAtom);
  const [, setHoveredBlockId] = useAtom(hoveredBlockIdAtom);
  const [hiddenBlockIds] = useAtom(hiddenBlockIdsAtom);
  const [activePageId] = useAtom(activePageIdAtom);
  const [showGrid] = useAtom(showGridAtom);
  const [gridSize] = useAtom(gridSizeAtom);
  const [draggedBlock, setDraggedBlock] = useState<{
    type: "library" | "existing";
    blockType?: FunnelBlockType;
    blockId?: string;
  } | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  const { mutate: createBlock } = useMutation(
    trpc.funnels.createBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const { mutate: moveBlock } = useMutation(
    trpc.funnels.moveBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  // Setup droppable for root canvas - must be before any early returns
  const { setNodeRef: setCanvasRef, isOver: isOverCanvas } = useDroppable({
    id: "canvas-root",
    data: {
      type: "canvas",
      canHaveChildren: true,
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">No Page Selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a page from the Pages panel or create a new one to start building.
          </p>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === "library" && data?.blockType) {
      setDraggedBlock({
        type: "library",
        blockType: data.blockType as FunnelBlockType,
      });
    } else if ((data?.type === "block" || data?.type === "existing") && data?.blockId) {
      setDraggedBlock({
        type: "existing",
        blockId: data.blockId,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !activePageId) {
      setDraggedBlock(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle dropping a library block onto canvas or container
    if (activeData?.type === "library" && activeData?.blockType) {
      const blockType = activeData.blockType as FunnelBlockType;
      const definition = getBlockDefinition(blockType);

      if (!definition) {
        setDraggedBlock(null);
        return;
      }

      // Determine parent and position
      let parentBlockId: string | undefined;
      let targetOrder = 0;

      if (overData?.type === "block") {
        const overBlock = page.blocks.find((b) => b.id === overData.blockId);
        if (overBlock) {
          // If dropping on a container, add as child
          if (overData.canHaveChildren) {
            parentBlockId = overData.blockId;
            // Add as last child
            const childCount = page.blocks.filter(
              (b) => b.parentBlockId === overData.blockId
            ).length;
            targetOrder = childCount;
          } else {
            // If dropping on a non-container, add as sibling after it
            parentBlockId = overBlock.parentBlockId || undefined;
            targetOrder = overBlock.order + 1;
          }
        }
      }

      // Check if we're in a smart section context
      const isSmartSection = activePageId?.startsWith("smart-section:");
      const actualId = isSmartSection ? activePageId.replace("smart-section:", "") : activePageId;

      createBlock({
        pageId: isSmartSection ? undefined : actualId,
        smartSectionId: isSmartSection ? actualId : undefined,
        type: blockType,
        props: definition.defaultProps,
        styles: definition.defaultStyles,
        parentBlockId,
        order: targetOrder,
      });
    }

    // Handle moving an existing block
    if ((activeData?.type === "block" || activeData?.type === "existing") && activeData?.blockId) {
      const blockId = activeData.blockId;
      const activeBlock = page.blocks.find((b) => b.id === blockId);

      if (!activeBlock) {
        setDraggedBlock(null);
        return;
      }

      let newParentId: string | null = null;
      let newOrder = 0;

      if (overData?.type === "block") {
        const overBlock = page.blocks.find((b) => b.id === overData.blockId);

        if (overBlock && blockId !== overBlock.id) {
          // Don't allow dropping a block into its own descendants
          const isDescendant = (parentId: string, childId: string): boolean => {
            const child = page.blocks.find((b) => b.id === childId);
            if (!child || !child.parentBlockId) return false;
            if (child.parentBlockId === parentId) return true;
            return isDescendant(parentId, child.parentBlockId);
          };

          if (!isDescendant(blockId, overBlock.id)) {
            if (overData.canHaveChildren) {
              // Drop into container
              newParentId = overBlock.id;
              const siblingCount = page.blocks.filter(
                (b) => b.parentBlockId === overBlock.id
              ).length;
              newOrder = siblingCount;
            } else {
              // Drop as sibling
              newParentId = overBlock.parentBlockId;
              newOrder = overBlock.order + 1;
            }

            moveBlock({
              blockId,
              newParentBlockId: newParentId,
              newOrder,
            });
          }
        }
      } else if (overData?.type === "canvas") {
        // Drop at root level
        const rootBlockCount = page.blocks.filter((b) => !b.parentBlockId).length;
        moveBlock({
          blockId,
          newParentBlockId: null,
          newOrder: rootBlockCount,
        });
      }
    }

    setDraggedBlock(null);
  };

  // Get root blocks (blocks without a parent)
  const rootBlocks = page.blocks
    .filter((block) => !block.parentBlockId)
    .sort((a, b) => a.order - b.order);

  // Calculate canvas width based on device mode
  const canvasWidths = {
    [DeviceType.DESKTOP]: "100%",
    [DeviceType.TABLET]: "768px",
    [DeviceType.MOBILE]: "375px",
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="flex-1 bg-muted/5">
        <div className="min-h-full flex items-start justify-center p-8">
          <div
            ref={setCanvasRef}
            className={cn(
              "bg-white shadow-lg transition-all duration-300 relative",
              "min-h-[600px]",
              isOverCanvas && "ring-2 ring-blue-400 ring-offset-4"
            )}
            style={{
              width: canvasWidths[deviceMode],
              maxWidth: "100%",
            }}
            data-droppable-canvas="true"
          >
            {/* Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent ${gridSize - 1}px,
                      rgba(0, 0, 0, 0.05) ${gridSize - 1}px,
                      rgba(0, 0, 0, 0.05) ${gridSize}px
                    ),
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent ${gridSize - 1}px,
                      rgba(0, 0, 0, 0.05) ${gridSize - 1}px,
                      rgba(0, 0, 0, 0.05) ${gridSize}px
                    )
                  `,
                }}
              />
            )}
            {rootBlocks.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px] text-center p-8">
                <div>
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-semibold mb-2">Canvas is Empty</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Drag blocks from the Blocks panel to start building your page.
                  </p>
                </div>
              </div>
            ) : (
              <SortableContext
                items={rootBlocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div onMouseLeave={() => setHoveredBlockId(null)}>
                  {rootBlocks.map((block) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      allBlocks={page.blocks}
                      deviceMode={deviceMode}
                      isSelected={selectedBlockId === block.id}
                      isHidden={hiddenBlockIds.has(block.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </div>
      </ScrollArea>

      <DragOverlay>
        {draggedBlock && (
          <div className="bg-primary/10 border-2 border-primary rounded-md p-4 shadow-lg">
            <div className="text-sm font-medium">
              {draggedBlock.type === "library"
                ? getBlockDefinition(draggedBlock.blockType!)?.label
                : "Moving block..."}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
