"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useDraggable } from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Boxes, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllCategories,
  getBlocksByCategory,
} from "../../../lib/block-registry";
import type { BlockDefinition, BlockTreeNode } from "../../../types";
import { blockSearchAtom, dragSourceAtom } from "../../../lib/editor-store";
import { activePageIdAtom } from "../../../lib/editor-store";
import { FunnelBlockType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function BlocksPanel() {
  const [searchQuery, setSearchQuery] = useAtom(blockSearchAtom);
  const [, setDragSource] = useAtom(dragSourceAtom);
  const [activePageId] = useAtom(activePageIdAtom);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([...getAllCategories(), "Smart Sections"])
  );

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch smart sections
  const { data: smartSections } = useQuery({
    ...trpc.smartSections.list.queryOptions(),
  });

  const { mutate: createBlockMutation } = useMutation(
    trpc.funnels.createBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const { mutate: insertSection } = useMutation(
    trpc.smartSections.insertInstance.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Section inserted");
      },
      onError: (error) => {
        toast.error("Failed to insert section", {
          description: error.message,
        });
      },
    })
  );

  const categories = getAllCategories();

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleBlockClick = (blockType: FunnelBlockType, definition: BlockDefinition) => {
    if (!activePageId) return;

    // Check if we're in a smart section context
    const isSmartSection = activePageId.startsWith("smart-section:");
    const actualId = isSmartSection ? activePageId.replace("smart-section:", "") : activePageId;

    createBlockMutation({
      pageId: isSmartSection ? undefined : actualId,
      smartSectionId: isSmartSection ? actualId : undefined,
      type: blockType,
      props: definition.defaultProps,
      styles: definition.defaultStyles,
    });
  };

  const handleInsertSection = async (sectionId: string) => {
    if (!activePageId) return;

    // Don't allow inserting sections inside smart section editor
    if (activePageId.startsWith("smart-section:")) {
      toast.error("Cannot insert smart sections inside other smart sections");
      return;
    }

    // Create a smart section instance (creates a reference, not a copy)
    // The backend will check if the section has blocks
    insertSection({
      sectionId,
      funnelPageId: activePageId,
    });
  };

  const filteredCategories = categories.map((category) => {
    const blocks = getBlocksByCategory(category);
    const filtered = searchQuery
      ? blocks.filter((block) =>
          block.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : blocks;

    return { category, blocks: filtered };
  }).filter((cat) => cat.blocks.length > 0);

  const filteredSmartSections = smartSections?.filter((section) =>
    section.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <h3 className="text-sm font-semibold">Add Blocks</h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Smart Sections Category */}
          {filteredSmartSections.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => toggleCategory("Smart Sections")}
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Boxes className="h-3 w-3" />
                  Smart Sections
                </span>
                <span className="text-xs">
                  {expandedCategories.has("Smart Sections") ? "−" : "+"}
                </span>
              </button>

              {expandedCategories.has("Smart Sections") && (
                <div className="space-y-2">
                  {filteredSmartSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleInsertSection(section.id)}
                      disabled={!activePageId}
                      className={cn(
                        "w-full rounded-md border bg-card p-3 text-left transition-all",
                        "hover:border-primary/50 hover:shadow-sm active:scale-95",
                        !activePageId && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Download className="h-4 w-4 mt-0.5 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {section.name}
                          </div>
                          {section.category && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {section.category}
                            </Badge>
                          )}
                          {section.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {section.description}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {(section._count as any).smartSectionInstance} uses
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regular Block Categories */}
          {filteredCategories.length === 0 && filteredSmartSections.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No blocks found matching "{searchQuery}"
            </div>
          ) : (
            filteredCategories.map(({ category, blocks }) => (
              <div key={category} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{category}</span>
                  <span className="text-xs">
                    {expandedCategories.has(category) ? "−" : "+"}
                  </span>
                </button>

                {expandedCategories.has(category) && (
                  <div className="grid grid-cols-2 gap-2">
                    {blocks.map((block) => (
                      <BlockCard
                        key={block.type}
                        block={block}
                        onClick={() => handleBlockClick(block.type, block)}
                        disabled={!activePageId}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {!activePageId && (
        <div className="p-3 border-t bg-muted/50 text-xs text-muted-foreground text-center">
          Select a page to add blocks
        </div>
      )}
    </div>
  );
}

interface BlockCardProps {
  block: BlockDefinition;
  onClick: () => void;
  disabled?: boolean;
}

function BlockCard({ block, onClick, disabled }: BlockCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${block.type}`,
    data: {
      type: "library",
      blockType: block.type,
    },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-lg border bg-card text-card-foreground transition-all",
        "hover:border-primary/50 hover:shadow-sm active:scale-95 cursor-grab active:cursor-grabbing",
        disabled && "opacity-50 cursor-not-allowed hover:border-border",
        isDragging && "opacity-50"
      )}
    >
      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        <span className="text-xl">{getBlockIcon(block.type)}</span>
      </div>
      <span className="text-xs font-medium text-center leading-tight">
        {block.label}
      </span>
    </button>
  );
}

// Simple icon mapping for blocks
function getBlockIcon(type: FunnelBlockType): string {
  const icons: Partial<Record<FunnelBlockType, string>> = {
    // Layouts
    CONTAINER: "📦",
    ONE_COLUMN: "▭",
    TWO_COLUMN: "▯",
    THREE_COLUMN: "☰",
    SECTION: "◫",

    // Typography
    HEADING: "H",
    PARAGRAPH: "¶",
    LABEL: "L",
    RICH_TEXT: "✎",

    // Media
    IMAGE: "🖼️",
    VIDEO: "▶️",
    ICON: "★",

    // Forms
    INPUT: "⌨️",
    TEXTAREA: "📝",
    SELECT: "▼",
    CHECKBOX: "☑",
    BUTTON: "⬚",
    FORM: "📋",

    // Components
    CARD: "🃏",
    FAQ: "❓",
    TESTIMONIAL: "💬",
    PRICING: "💰",
    FEATURE_GRID: "⊞",

    // Embeds
    IFRAME: "🌐",
    CUSTOM_HTML: "</>",
    SCRIPT: "{ }",
  };

  return icons[type] || "□";
}
