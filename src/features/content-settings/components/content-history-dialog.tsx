import { useMutation, useQuery } from "@tanstack/react-query";
import { History, RotateCcw, Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTRPC } from "@/trpc/client";

import { PayloadPreview } from "./payload-preview";
import type { ContentItem } from "./types";

export function ContentHistoryDialog({ item, canManage, onOpenChange, onChanged }: { item: ContentItem | null; canManage: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }): React.JSX.Element {
  const trpc = useTRPC();
  const detail = useQuery({ ...trpc.contentSettings.get.queryOptions({ itemId: item?.id ?? "pending" }), enabled: Boolean(item) });
  const publish = useMutation(trpc.contentSettings.publish.mutationOptions());
  const rollback = useMutation(trpc.contentSettings.rollback.mutationOptions());
  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null);
  React.useEffect(() => setSelectedVersion(item?.currentVersion ?? null), [item]);
  const selected = detail.data?.history.find((version) => version.version === selectedVersion) ?? detail.data?.history[0];

  const run = async (action: "publish" | "rollback"): Promise<void> => {
    if (!item || !selected) return;
    try {
      if (action === "publish") await publish.mutateAsync({ itemId: item.id, version: selected.version });
      else await rollback.mutateAsync({ itemId: item.id, targetVersion: selected.version, expectedVersion: detail.data?.item.currentVersion ?? item.currentVersion, changeNote: `Restored version ${selected.version}` });
      toast.success(action === "publish" ? `Version ${selected.version} published` : `Version ${selected.version} restored as a new draft`);
      await Promise.all([detail.refetch(), onChanged()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Content lifecycle action failed");
    }
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="size-4" /> {item?.name}</DialogTitle><DialogDescription>Preview an immutable version, publish it, or restore it as a new draft.</DialogDescription></DialogHeader>
        {detail.isLoading ? <p role="status" className="py-8 text-xs text-muted-foreground">Loading version history</p> : detail.isError ? <p className="py-8 text-xs text-destructive">{detail.error.message}</p> : detail.data ? (
          <div className="grid gap-5 py-3 sm:grid-cols-[12rem_1fr]">
            <div className="space-y-1" aria-label="Content versions">{detail.data.history.map((version) => <Button key={version.id} type="button" variant={selected?.version === version.version ? "secondary" : "ghost"} className="h-auto w-full justify-between px-2 py-2" onClick={() => setSelectedVersion(version.version)}><span>Version {version.version}</span><span className="flex gap-1">{detail.data.item.publishedVersion === version.version ? <Badge>Live</Badge> : null}{detail.data.item.currentVersion === version.version ? <Badge variant="outline">Draft</Badge> : null}</span></Button>)}</div>
            <div className="min-w-0 space-y-4 border-t pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              {selected ? <><div><p className="text-xs text-muted-foreground">{selected.changeNote ?? "No change note"}</p><p className="text-xs text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</p></div><PayloadPreview payload={selected.payload} /></> : null}
            </div>
          </div>
        ) : null}
        <DialogFooter>{canManage && selected && !item?.archivedAt ? <><Button type="button" variant="outline" disabled={rollback.isPending || selected.version === detail.data?.item.currentVersion} onClick={() => void run("rollback")}><RotateCcw className="size-4" /> Restore as draft</Button><Button type="button" disabled={publish.isPending || selected.version === detail.data?.item.publishedVersion} onClick={() => void run("publish")}><Upload className="size-4" /> Publish version</Button></> : null}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
