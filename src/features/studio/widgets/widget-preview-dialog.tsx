"use client";

import { Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PREVIEW_WIDTHS = {
  desktop: "max-w-[1180px]",
  tablet: "max-w-[768px]",
  mobile: "max-w-[390px]",
} as const;

type PreviewSize = keyof typeof PREVIEW_WIDTHS;

export function WidgetPreviewDialog({
  widgetId,
  widgetName,
  disabled,
}: {
  widgetId: string;
  widgetName: string;
  disabled: boolean;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [size, setSize] = React.useState<PreviewSize>("desktop");
  const [previewKey, setPreviewKey] = React.useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1" disabled={disabled}>
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[92vh] w-[calc(100vw-2rem)] max-w-[1500px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 shadow-none sm:max-w-[1500px]">
        <div className="flex flex-col gap-3 border-b px-5 py-4 pr-12 sm:flex-row sm:items-center sm:justify-between">
          <DialogHeader>
            <DialogTitle>{widgetName}</DialogTitle>
            <DialogDescription>
              Saved draft preview using the same renderer as the published widget.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1">
            <PreviewButton
              active={size === "desktop"}
              label="Desktop"
              onClick={() => setSize("desktop")}
            >
              <Monitor aria-hidden="true" />
            </PreviewButton>
            <PreviewButton
              active={size === "tablet"}
              label="Tablet"
              onClick={() => setSize("tablet")}
            >
              <Tablet aria-hidden="true" />
            </PreviewButton>
            <PreviewButton
              active={size === "mobile"}
              label="Mobile"
              onClick={() => setSize("mobile")}
            >
              <Smartphone aria-hidden="true" />
            </PreviewButton>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh preview"
              title="Refresh preview"
              onClick={() => setPreviewKey((current) => current + 1)}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 overflow-auto bg-muted/35 p-3 sm:p-6">
          <div
            className={cn(
              "mx-auto h-full min-h-[560px] w-full overflow-hidden rounded-xl border bg-white transition-[max-width] duration-200",
              PREVIEW_WIDTHS[size],
            )}
          >
            <iframe
              key={previewKey}
              src={`/widget-preview/${encodeURIComponent(widgetId)}`}
              title={`${widgetName} draft preview`}
              className="size-full border-0"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-7 gap-1.5 px-2 text-[11px]"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
