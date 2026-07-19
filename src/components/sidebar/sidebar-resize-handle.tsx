"use client";

import type { KeyboardEvent, PointerEvent } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  useSidebarPreferences,
} from "./sidebar-preferences";

const KEYBOARD_RESIZE_STEP = 8;

export function SidebarResizeHandle(): React.JSX.Element | null {
  const { state } = useSidebar();
  const { width, setWidth, setIsResizing } = useSidebarPreferences();

  if (state === "collapsed") return null;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    setIsResizing(true);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent): void => {
      setWidth(startWidth + moveEvent.clientX - startX);
    };
    const stopResizing = (): void => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setWidth(width - KEYBOARD_RESIZE_STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setWidth(width + KEYBOARD_RESIZE_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      setWidth(MIN_SIDEBAR_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      setWidth(MAX_SIDEBAR_WIDTH);
    }
  };

  return (
    <div
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => setWidth(DEFAULT_SIDEBAR_WIDTH)}
      className="group/resize absolute inset-y-0 right-0 z-40 hidden w-2 translate-x-1/2 cursor-col-resize touch-none focus-visible:outline-none md:block"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover/resize:bg-primary/20 group-focus-visible/resize:bg-primary/40" />
    </div>
  );
}
