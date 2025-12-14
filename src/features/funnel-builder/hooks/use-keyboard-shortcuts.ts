"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  selectedBlockIdAtom,
  showGridAtom,
  activeSidebarAtom,
} from "../lib/editor-store";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Keyboard Shortcuts Hook
 *
 * Handles all keyboard shortcuts in the funnel editor:
 * - Cmd/Ctrl+Z: Undo (coming soon)
 * - Cmd/Ctrl+Shift+Z or Ctrl+Y: Redo (coming soon)
 * - D: Duplicate selected block
 * - Delete/Backspace: Delete selected block
 * - G: Toggle grid overlay
 * - A: Focus blocks panel
 * - Escape: Deselect block
 */
export function useKeyboardShortcuts(
  pageId: string | undefined,
  onDuplicateBlock?: (blockId: string) => void,
  onRequestDelete?: (blockId: string) => void
) {
  const [selectedBlockId, setSelectedBlockId] = useAtom(selectedBlockIdAtom);
  const [showGrid, setShowGrid] = useAtom(showGridAtom);
  const [activeSidebar, setActiveSidebar] = useAtom(activeSidebarAtom);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutate: deleteBlock, isPending: isDeleting } = useMutation(
    trpc.funnels.deleteBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Block deleted");
        setSelectedBlockId(null);
      },
      onError: (error) => {
        toast.error("Failed to delete block", {
          description: error.message,
        });
      },
    })
  );

  const { mutate: duplicateBlock, isPending: isDuplicating } = useMutation(
    trpc.funnels.duplicateBlock.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries();
        toast.success("Block duplicated", {
          description: "The block has been duplicated below the original.",
        });
        // Select the new block
        setSelectedBlockId(data.id);
      },
      onError: (error) => {
        toast.error("Failed to duplicate block", {
          description: error.message,
        });
      },
    })
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd+Z or Ctrl+Z - Undo (coming soon)
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        toast.info("Undo coming soon!", {
          description: "We're working on implementing undo/redo functionality.",
        });
        return;
      }

      // Cmd+Shift+Z or Ctrl+Y - Redo (coming soon)
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") ||
        (e.ctrlKey && e.key === "y")
      ) {
        e.preventDefault();
        toast.info("Redo coming soon!", {
          description: "We're working on implementing undo/redo functionality.",
        });
        return;
      }

      // Don't handle other shortcuts if typing
      if (isInput) return;

      // D - Duplicate selected block
      if (e.key === "d" && selectedBlockId && !e.metaKey && !e.ctrlKey && !isDuplicating) {
        e.preventDefault();
        duplicateBlock({ blockId: selectedBlockId });
        return;
      }

      // Delete or Backspace - Delete selected block
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedBlockId &&
        !isDeleting
      ) {
        e.preventDefault();
        if (onRequestDelete) {
          // Use callback to open dialog in parent component
          onRequestDelete(selectedBlockId);
        } else {
          // Fallback to direct deletion (shouldn't happen in normal use)
          deleteBlock({ blockId: selectedBlockId });
        }
        return;
      }

      // G - Toggle grid
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowGrid(!showGrid);
        toast.success(showGrid ? "Grid hidden" : "Grid visible");
        return;
      }

      // A - Focus blocks panel
      if (e.key === "a" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setActiveSidebar("blocks");
        // Focus the search input if it exists
        setTimeout(() => {
          const searchInput = document.querySelector(
            'input[placeholder*="Search blocks"]'
          ) as HTMLInputElement;
          searchInput?.focus();
        }, 100);
        return;
      }

      // Escape - Deselect block
      if (e.key === "Escape" && selectedBlockId) {
        e.preventDefault();
        setSelectedBlockId(null);
        toast.info("Block deselected");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedBlockId,
    showGrid,
    isDeleting,
    isDuplicating,
    deleteBlock,
    duplicateBlock,
    setSelectedBlockId,
    setShowGrid,
    setActiveSidebar,
  ]);
}
