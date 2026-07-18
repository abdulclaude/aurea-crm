import { useMutation } from "@tanstack/react-query";
import { Archive, Eye, Pencil, Plus, Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { ContentLibraryKind } from "@/features/content-settings/contracts";
import { useTRPC } from "@/trpc/client";

import { ContentHistoryDialog } from "./content-history-dialog";
import { ContentItemDialog } from "./content-item-dialog";
import { KIND_LABELS, type ContentItem } from "./types";

const DESCRIPTIONS: Record<ContentLibraryKind, string> = {
  TERMINOLOGY_PACK: "Published workspace language for bounded customer, staff, service, and schedule labels.",
  FAQ_COLLECTION: "Versioned question collections for published profiles and funnel surfaces.",
  MESSAGE_MACRO: "Reusable approved copy for inbox, SMS, and email composers.",
  PUBLIC_PROFILE: "Public business identity and contact content with an explicit publication step.",
};

export function ContentLibraryPanel({ kind, items, canManage, onRefresh }: { kind: ContentLibraryKind; items: ContentItem[]; canManage: boolean; onRefresh: () => Promise<void> }): React.JSX.Element {
  const trpc = useTRPC();
  const [editing, setEditing] = React.useState<ContentItem | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [historyItem, setHistoryItem] = React.useState<ContentItem | null>(null);
  const [archivingItem, setArchivingItem] = React.useState<ContentItem | null>(null);
  const publish = useMutation(trpc.contentSettings.publish.mutationOptions());
  const archive = useMutation(trpc.contentSettings.archive.mutationOptions());

  const publishCurrent = async (item: ContentItem): Promise<void> => {
    try {
      await publish.mutateAsync({ itemId: item.id, version: item.currentVersion });
      toast.success(`${item.name} published`);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Content could not be published");
    }
  };
  const archiveItem = async (item: ContentItem): Promise<void> => {
    try {
      await archive.mutateAsync({ itemId: item.id });
      toast.success(`${item.name} archived`);
      setArchivingItem(null);
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Content could not be archived");
    }
  };

  return (
    <section aria-labelledby={`content-${kind}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
        <div><h2 id={`content-${kind}`} className="text-sm font-semibold">{KIND_LABELS[kind]}</h2><p className="max-w-2xl text-xs text-muted-foreground">{DESCRIPTIONS[kind]}</p></div>
        {canManage ? <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus className="size-4" /> Add</Button> : null}
      </div>
      <div className="divide-y border-y">
        {items.length === 0 ? <p className="py-10 text-center text-xs text-muted-foreground">No reusable content configured.</p> : items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{item.name}</p><Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"}>{item.status.toLowerCase()}</Badge>{item.hasUnpublishedChanges && !item.archivedAt ? <Badge variant="outline">Changes pending</Badge> : null}</div><p className="truncate text-xs text-muted-foreground">{item.key} · draft v{item.currentVersion}{item.publishedVersion ? ` · live v${item.publishedVersion}` : ""}</p>{item.description ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.description}</p> : null}</div>
            <div className="flex flex-wrap items-center gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setHistoryItem(item)}><Eye className="size-4" /> Preview</Button>
              {canManage && !item.archivedAt ? <><Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(item); setEditorOpen(true); }}><Pencil className="size-4" /> Edit</Button><Button type="button" size="sm" variant="ghost" disabled={!item.hasUnpublishedChanges || publish.isPending} onClick={() => void publishCurrent(item)}><Upload className="size-4" /> Publish</Button><Button type="button" size="sm" variant="ghost" disabled={archive.isPending} onClick={() => setArchivingItem(item)}><Archive className="size-4" /> Archive</Button></> : null}
            </div>
          </div>
        ))}
      </div>
      <ContentItemDialog open={editorOpen} kind={kind} item={editing} onOpenChange={setEditorOpen} onSaved={onRefresh} />
      <ContentHistoryDialog item={historyItem} canManage={canManage} onOpenChange={(open) => { if (!open) setHistoryItem(null); }} onChanged={onRefresh} />
      <AlertDialog open={Boolean(archivingItem)} onOpenChange={(open) => { if (!open) setArchivingItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Archive {archivingItem?.name}?</AlertDialogTitle><AlertDialogDescription>Published and internal consumers will stop resolving this item. Version history remains available.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={archive.isPending} onClick={() => { if (archivingItem) void archiveItem(archivingItem); }}>Archive</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
