"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  activePageIdAtom,
  selectedBlockIdAtom,
  hiddenBlockIdsAtom,
} from "../../../lib/editor-store";
import { getBlockDefinition } from "../../../lib/block-registry";
import type { FunnelBlock, FunnelBreakpoint } from "@prisma/client";

type BlockWithChildren = FunnelBlock & {
  breakpoints: FunnelBreakpoint[];
  childBlocks: BlockWithChildren[];
};

export function DesignPanel() {
  const [activePageId] = useAtom(activePageIdAtom);
  const [selectedBlockId, setSelectedBlockId] = useAtom(selectedBlockIdAtom);
  const [hiddenBlockIds, setHiddenBlockIds] = useAtom(hiddenBlockIdsAtom);

  const trpc = useTRPC();
  const { data: page } = useQuery({
    ...trpc.funnels.getPage.queryOptions({ pageId: activePageId ?? "" }),
    enabled: !!activePageId,
  });

  if (!activePageId || !page) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
        Select a page to view its design layers
      </div>
    );
  }

  // Build tree structure from flat blocks
  const buildTree = (blocks: (FunnelBlock & { breakpoints: FunnelBreakpoint[] })[]): BlockWithChildren[] => {
    const blockMap = new Map<string, BlockWithChildren>();
    const rootBlocks: BlockWithChildren[] = [];

    // First pass: Create all block objects with empty children arrays
    blocks.forEach((block) => {
      blockMap.set(block.id, { ...block, childBlocks: [] });
    });

    // Second pass: Build the tree structure
    blocks.forEach((block) => {
      const blockWithChildren = blockMap.get(block.id)!;
      if (block.parentBlockId) {
        const parent = blockMap.get(block.parentBlockId);
        if (parent) {
          parent.childBlocks.push(blockWithChildren);
        }
      } else {
        rootBlocks.push(blockWithChildren);
      }
    });

    // Sort by order
    const sortBlocks = (blocks: BlockWithChildren[]) => {
      blocks.sort((a, b) => a.order - b.order);
      blocks.forEach((block) => sortBlocks(block.childBlocks));
    };
    sortBlocks(rootBlocks);

    return rootBlocks;
  };

  const tree = buildTree(page.funnelBlock as any);

  const toggleVisibility = (blockId: string) => {
    const newHidden = new Set(hiddenBlockIds);
    if (newHidden.has(blockId)) {
      newHidden.delete(blockId);
    } else {
      newHidden.add(blockId);
    }
    setHiddenBlockIds(newHidden);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold">Design Layers</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {page.name}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {tree.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No blocks yet. Add blocks from the Blocks panel.
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((block) => (
                <BlockTreeItem
                  key={block.id}
                  block={block}
                  level={0}
                  selectedBlockId={selectedBlockId}
                  onSelect={setSelectedBlockId}
                  hiddenBlockIds={hiddenBlockIds}
                  onToggleVisibility={toggleVisibility}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface BlockTreeItemProps {
  block: BlockWithChildren;
  level: number;
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
  hiddenBlockIds: Set<string>;
  onToggleVisibility: (id: string) => void;
}

function BlockTreeItem({
  block,
  level,
  selectedBlockId,
  onSelect,
  hiddenBlockIds,
  onToggleVisibility,
}: BlockTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const definition = getBlockDefinition(block.type);
  const hasChildren = block.childBlocks.length > 0;
  const isHidden = hiddenBlockIds.has(block.id);
  const isSelected = selectedBlockId === block.id;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted",
          isHidden && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(block.id)}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-4" />
        )}

        <span className="flex-1 truncate text-xs">
          {definition?.label || block.type}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(block.id);
            }}
          >
            {isHidden ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>

          {block.locked && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {block.childBlocks.map((child) => (
            <BlockTreeItem
              key={child.id}
              block={child}
              level={level + 1}
              selectedBlockId={selectedBlockId}
              onSelect={onSelect}
              hiddenBlockIds={hiddenBlockIds}
              onToggleVisibility={onToggleVisibility}
            />
          ))}
        </div>
      )}
    </div>
  );
}
