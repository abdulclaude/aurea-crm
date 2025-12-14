import { atom } from "jotai";
import { DeviceType } from "@prisma/client";

/**
 * Funnel Editor State Management with Jotai
 *
 * This store manages the editor UI state including:
 * - Selected/hovered blocks
 * - Device preview mode
 * - Active sidebar panel
 * - Drag and drop state
 */

// Selected block ID
export const selectedBlockIdAtom = atom<string | null>(null);

// Hovered block ID (for hover outline)
export const hoveredBlockIdAtom = atom<string | null>(null);

// Current device preview mode
export const deviceModeAtom = atom<DeviceType>(DeviceType.DESKTOP);

// Active left sidebar panel: "pages" | "design" | "blocks"
export const activeSidebarAtom = atom<"pages" | "design" | "blocks">("pages");

// Canvas zoom level (1.0 = 100%)
export const canvasZoomAtom = atom<number>(1.0);

// Is currently dragging a block
export const isDraggingAtom = atom<boolean>(false);

// Drag source (block being dragged from library or existing block being moved)
export const dragSourceAtom = atom<{
  type: "library" | "canvas";
  blockType?: string; // For library blocks
  blockId?: string; // For canvas blocks
} | null>(null);

// Currently active page ID
export const activePageIdAtom = atom<string | null>(null);

// Undo/redo history
interface HistoryEntry {
  action: string;
  timestamp: number;
  data: unknown;
}

export const historyAtom = atom<HistoryEntry[]>([]);
export const historyIndexAtom = atom<number>(-1);

// Canvas settings
export const showGridAtom = atom<boolean>(false);
export const snapToGridAtom = atom<boolean>(false);
export const gridSizeAtom = atom<number>(8);

// Block visibility (for layer panel)
export const hiddenBlockIdsAtom = atom<Set<string>>(new Set<string>());

// Properties panel open state
export const propertiesPanelOpenAtom = atom<boolean>(true);

// Block search/filter in library
export const blockSearchAtom = atom<string>("");
