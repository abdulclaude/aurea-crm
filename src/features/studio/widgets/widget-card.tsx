"use client";

import { Code2, Copy, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { WIDGET_CATALOG_META } from "@/features/studio/widgets/widget-catalog-meta";
import type { WidgetListItem } from "@/features/studio/widgets/widget-list-types";
import { WidgetPreviewDialog } from "@/features/studio/widgets/widget-preview-dialog";
import { WidgetSettingsControl } from "@/features/studio/widgets/widget-settings-control";

export function WidgetCard({
  widget,
  canManage,
  mutationPending,
  onActiveChange,
  onCopy,
  onDelete,
}: {
  widget: WidgetListItem;
  canManage: boolean;
  mutationPending: boolean;
  onActiveChange: (isActive: boolean) => Promise<void>;
  onCopy: (value: string) => Promise<void>;
  onDelete: () => Promise<void>;
}): React.JSX.Element {
  const meta = WIDGET_CATALOG_META[widget.type];
  const Icon = meta.icon;
  const sourceKey = widget.locationId
    ? `widget:${widget.id}:location:${widget.locationId}`
    : `widget:${widget.id}:organization`;
  const publicationHref = `/settings/publication?sourceKey=${encodeURIComponent(sourceKey)}`;

  return (
    <Card className="min-h-[340px] overflow-hidden p-0 [&>div]:gap-0 [&>div]:overflow-hidden [&>div]:py-0">
      <div className="flex items-start gap-4 p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/35">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{widget.name}</h3>
            <PublicationBadge state={widget.publicationState} />
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {meta.label}
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-1">
            <WidgetSettingsControl widget={widget} />
            <Switch
              checked={widget.isActive}
              disabled={mutationPending}
              aria-label={`${widget.isActive ? "Disable" : "Enable"} ${widget.name}`}
              onCheckedChange={(checked) => void onActiveChange(checked)}
            />
          </div>
        ) : null}
      </div>

      <div className="flex-1 px-5 pb-5">
        <p className="text-sm leading-6 text-muted-foreground">
          {meta.description}
        </p>
        {!widget.isActive ? (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-300">
            Enable this widget to preview or publish it.
          </p>
        ) : null}
        {widget.embed ? (
          <div className="mt-4 rounded-xl border bg-muted/25 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Code2 className="size-3" aria-hidden="true" />
                Embed code
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={() => void onCopy(widget.embed?.iframeCode ?? "")}
              >
                <Copy aria-hidden="true" />
                Copy
              </Button>
            </div>
            <pre className="line-clamp-3 whitespace-pre-wrap break-all font-mono text-[10px] leading-4 text-muted-foreground">
              {widget.embed.iframeCode}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/15 p-4">
        <WidgetPreviewDialog
          widgetId={widget.id}
          widgetName={widget.name}
          disabled={!widget.isActive}
        />
        {widget.embed ? (
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={widget.embed.previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              View published
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="flex-1">
            <Link href={publicationHref}>Publish</Link>
          </Button>
        )}
        {canManage ? (
          <DeleteWidgetButton
            name={widget.name}
            disabled={mutationPending}
            onDelete={onDelete}
          />
        ) : null}
      </div>
    </Card>
  );
}

function PublicationBadge({ state }: { state: WidgetListItem["publicationState"] }) {
  if (state === "CURRENT") return <Badge variant="default">Published</Badge>;
  if (state === "REPUBLISH_REQUIRED") {
    return <Badge variant="destructive">Changes not live</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}

function DeleteWidgetButton({ name, disabled, onDelete }: { name: string; disabled: boolean; onDelete: () => Promise<void> }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 className="text-destructive" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete widget?</AlertDialogTitle>
          <AlertDialogDescription>
            Its publication will be archived and existing embeds will stop working.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={disabled} onClick={() => void onDelete()}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
