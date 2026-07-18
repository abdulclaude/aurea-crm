"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Loader2, Pencil, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";
import type { CommunicationRuleListItem } from "./communication-control-types";
import { CommunicationRuleEditor } from "./communication-rule-editor";

export function CommunicationRulesSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<CommunicationRuleListItem | null>(null);
  const [cloneSource, setCloneSource] = useState<CommunicationRuleListItem | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneEventKey, setCloneEventKey] = useState("");
  const rules = useQuery(
    trpc.communications.listRules.queryOptions({ query, includeInactive: false, limit: 100 }),
  );
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.communications.listRules.queryKey() });
  };
  const version = useMutation(
    trpc.communications.versionRule.mutationOptions({
      onSuccess: async () => { toast.success("Rule status updated"); await refresh(); },
      onError: (error) => toast.error(error.message),
    }),
  );
  const clone = useMutation(
    trpc.communications.cloneRule.mutationOptions({
      onSuccess: async () => { toast.success("Rule cloned"); setCloneSource(null); await refresh(); },
      onError: (error) => toast.error(error.message),
    }),
  );
  const archive = useMutation(
    trpc.communications.archiveRule.mutationOptions({
      onSuccess: async () => { toast.success("Rule archived"); await refresh(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const toggle = (rule: CommunicationRuleListItem, enabled: boolean) => {
    const common = {
      purpose: rule.purpose,
      isEnabled: enabled,
      scheduleOffsetMinutes: rule.scheduleOffsetMinutes ?? 0,
      changeNote: enabled ? "Enabled from communication settings" : "Disabled from communication settings",
    };
    version.mutate({
      ruleId: rule.id,
      expectedVersion: rule.currentVersion,
      values: rule.channel === "SMS"
        ? { ...common, channel: "SMS", subject: null, textBody: rule.textBody ?? "Message", htmlBody: null }
        : { ...common, channel: "EMAIL", subject: rule.subject ?? "Message", textBody: rule.textBody, htmlBody: rule.htmlBody },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-sm font-medium">Transactional rules and reminders</h2><p className="mt-1 text-xs text-muted-foreground">Control event-based email and text content, timing, and enablement.</p></div>
        <Button size="sm" onClick={() => { setSelected(null); setEditorOpen(true); }}><Plus />New rule</Button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search communication rules" className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or event key" /></div>
      {rules.isLoading ? <Status label="Loading rules" /> : null}
      {rules.isError ? <p role="alert" className="text-xs text-destructive">{rules.error.message}</p> : null}
      <div className="divide-y border-y">
        {rules.data?.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{rule.name}</p><Badge variant="outline">{rule.channel}</Badge><Badge variant="outline">v{rule.currentVersion}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{rule.eventKey} · {rule.purpose.toLowerCase().replaceAll("_", " ")} · offset {rule.scheduleOffsetMinutes ?? 0}m</p></div>
            <div className="flex items-center gap-1.5">
              <Switch aria-label={`${rule.isEnabled ? "Disable" : "Enable"} ${rule.name}`} checked={rule.isEnabled ?? false} onCheckedChange={(enabled) => toggle(rule, enabled)} disabled={version.isPending} />
              <Button size="icon-sm" variant="ghost" title="Edit rule" onClick={() => { setSelected(rule); setEditorOpen(true); }}><Pencil /></Button>
              <Button size="icon-sm" variant="ghost" title="Clone rule" onClick={() => { setCloneSource(rule); setCloneName(`${rule.name} copy`); setCloneEventKey(`${rule.eventKey}.copy`); }}><Copy /></Button>
              <Button size="icon-sm" variant="ghost" title="Archive rule" onClick={() => archive.mutate({ ruleId: rule.id })}><Archive /></Button>
            </div>
          </div>
        ))}
        {rules.data?.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No communication rules match this view.</p> : null}
      </div>
      <CommunicationRuleEditor open={editorOpen} onOpenChange={setEditorOpen} rule={selected} />
      <Dialog open={Boolean(cloneSource)} onOpenChange={(open) => { if (!open) setCloneSource(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Clone communication rule</DialogTitle><DialogDescription>Create an independent rule with the current immutable version as its starting point.</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="clone-rule-name">Name</Label><Input id="clone-rule-name" value={cloneName} onChange={(event) => setCloneName(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="clone-event-key">Event key</Label><Input id="clone-event-key" value={cloneEventKey} onChange={(event) => setCloneEventKey(event.target.value.toLowerCase())} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setCloneSource(null)}>Cancel</Button><Button disabled={!cloneSource || clone.isPending} onClick={() => cloneSource && clone.mutate({ ruleId: cloneSource.id, name: cloneName, eventKey: cloneEventKey })}>{clone.isPending ? <Loader2 className="animate-spin" /> : <Copy />}Clone</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Status({ label }: { label: string }) {
  return <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />{label}</div>;
}
