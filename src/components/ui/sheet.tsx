"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProgressiveBlur } from "./motion-primitives/progressive-blur";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-0 shadow-lg transition ease-in-out data-[state=closed]:duration-150 data-[state=open]:duration-150",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        )}
        {...props}
      >
        {children}
        {/* <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close> */}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function ResizableSheetContent({
  className,
  children,
  side = "right",
  defaultSize = 600,
  minSize = 500,
  maxSize = 800,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
}) {
  const [size, setSize] = React.useState(defaultSize);
  const [isDragging, setIsDragging] = React.useState(false);
  const isHorizontal = side === "left" || side === "right";

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isHorizontal) {
        const newSize =
          side === "right" ? window.innerWidth - e.clientX : e.clientX;
        setSize(Math.min(Math.max(newSize, minSize), maxSize));
      } else {
        const newSize =
          side === "bottom" ? window.innerHeight - e.clientY : e.clientY;
        setSize(Math.min(Math.max(newSize, minSize), maxSize));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isHorizontal, side, minSize, maxSize]);

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-0 shadow-lg data-[state=closed]:duration-150 data-[state=open]:duration-150",
          !isDragging && "transition ease-in-out",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full border-r",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 w-full border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 w-full border-t",
          // Override any max-width constraints from className
          isHorizontal && "[&]:max-w-none",
          className
        )}
        style={{
          [isHorizontal ? "width" : "height"]: `${size}px`,
        }}
        {...props}
      >
        {/* Resize Handle */}
        <button
          type="button"
          className={cn(
            "absolute bg-white/5 hover:bg-white/10 transition-colors cursor-col-resize z-50 group border-0 p-0",
            side === "right" && "left-0 inset-y-0 w-1.5 -translate-x-0.5",
            side === "left" && "right-0 inset-y-0 w-1.5 translate-x-0.5",
            side === "top" &&
              "bottom-0 inset-x-0 h-1.5 translate-y-0.5 cursor-row-resize",
            side === "bottom" &&
              "top-0 inset-x-0 h-1.5 -translate-y-0.5 cursor-row-resize",
            isDragging && "bg-white/20"
          )}
          onMouseDown={handleMouseDown}
          aria-label="Resize panel"
        >
          <span
            className={cn(
              "absolute bg-white/40 group-hover:bg-white/60 transition-colors rounded-full",
              isHorizontal
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8"
                : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-8"
            )}
          />
        </button>
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className="relative z-10 w-full ">
      <div
        data-slot="sheet-footer"
        className={cn(
          " flex gap-2 px-6 w-full relative z-10 bg-none",
          className
        )}
        {...props}
      />

      <ProgressiveBlur
        className="pointer-events-none absolute -top-3 right-0 h-full w-full z-1"
        direction="left"
        blurIntensity={0.3}
        blurLayers={20}
      />

      <ProgressiveBlur
        className="pointer-events-none absolute -top-3 right-0 h-full w-full z-1"
        direction="right"
        blurIntensity={0.3}
        blurLayers={20}
      />
    </div>
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-primary font-medium", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-primary/60 text-[11px]", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  ResizableSheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
