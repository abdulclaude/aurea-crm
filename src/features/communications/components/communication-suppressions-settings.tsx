"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2, Plus, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";

type SuppressionForm = {
  channel: "EMAIL" | "SMS";
  scope: "MARKETING" | "ALL";
  reason: "UNSUBSCRIBE" | "COMPLAINT" | "HARD_BOUNCE" | "SMS_STOP" | "INVALID_DESTINATION" | "MANUAL";
  destination: string;
  expiresAt?: Date;
};

const EMPTY: SuppressionForm = { channel: "EMAIL", scope: "ALL", reason: "MANUAL", destination: "" };

export function CommunicationSuppressionsSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SuppressionForm>(EMPTY);
  const list = useQuery(trpc.communications.listSuppressions.queryOptions({ query, includeInactive, limit: 100 }));
  const refresh = async () => queryClient.invalidateQueries({ queryKey: trpc.communications.listSuppressions.queryKey() });
  const create = useMutation(trpc.communications.createSuppression.mutationOptions({
    onSuccess: async () => { toast.success("Suppression added"); setOpen(false); setForm(EMPTY); await refresh(); },
    onError: (error) => toast.error(error.message),
  }));
  const revoke = useMutation(trpc.communications.revokeSuppression.mutationOptions({
    onSuccess: async () => { toast.success("Suppression removed"); await refresh(); },
    onError: (error) => toast.error(error.message),
  }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-medium">Suppression list</h2><p className="mt-1 text-xs text-muted-foreground">Block marketing or all delivery to an email address or phone number.</p></div><Button size="sm" onClick={() => setOpen(true)}><Plus />Add suppression</Button></div>
      <div className="flex flex-wrap items-center gap-4"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search suppressions" className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email or phone" /></div><div className="flex items-center gap-2"><Switch id="show-inactive-suppressions" checked={includeInactive} onCheckedChange={setIncludeInactive} /><Label htmlFor="show-inactive-suppressions">Show inactive</Label></div></div>
      {list.isLoading ? <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading suppressions</div> : null}
      {list.isError ? <p role="alert" className="text-xs text-destructive">{list.error.message}</p> : null}
      <div className="divide-y border-y">{list.data?.map((entry) => { const inactive = Boolean(entry.revokedAt) || Boolean(entry.expiresAt && entry.expiresAt <= new Date()); return <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{entry.destinationNormalized}</p><Badge variant="outline">{entry.channel}</Badge><Badge variant="outline">{entry.scope.toLowerCase()}</Badge>{inactive ? <Badge variant="secondary">Inactive</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{entry.reason.toLowerCase().replaceAll("_", " ")}{entry.expiresAt ? ` · expires ${entry.expiresAt.toLocaleDateString()}` : " · no expiry"}</p></div>{!inactive ? <Button size="sm" variant="outline" onClick={() => revoke.mutate({ id: entry.id })} disabled={revoke.isPending}><RotateCcw />Remove</Button> : null}</div>; })}{list.data?.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No suppressions match this view.</p> : null}</div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add suppression</DialogTitle><DialogDescription>Active suppressions are enforced by the durable delivery outbox.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2"><Field id="suppression-channel" label="Channel"><Select value={form.channel} onValueChange={(channel) => setForm({ ...form, channel: channel as SuppressionForm["channel"] })}><SelectTrigger id="suppression-channel" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="SMS">Text message</SelectItem></SelectContent></Select></Field><Field id="suppression-scope" label="Scope"><Select value={form.scope} onValueChange={(scope) => setForm({ ...form, scope: scope as SuppressionForm["scope"] })}><SelectTrigger id="suppression-scope" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All messages</SelectItem><SelectItem value="MARKETING">Marketing only</SelectItem></SelectContent></Select></Field><Field id="suppression-reason" label="Reason"><Select value={form.reason} onValueChange={(reason) => setForm({ ...form, reason: reason as SuppressionForm["reason"] })}><SelectTrigger id="suppression-reason" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["MANUAL", "UNSUBSCRIBE", "COMPLAINT", "HARD_BOUNCE", "SMS_STOP", "INVALID_DESTINATION"].map((reason) => <SelectItem key={reason} value={reason}>{reason.toLowerCase().replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></Field><Field id="suppression-destination" label={form.channel === "EMAIL" ? "Email address" : "Phone number"}><Input id="suppression-destination" value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder={form.channel === "EMAIL" ? "customer@example.com" : "+447700900000"} /></Field><Field id="suppression-expiry" label="Expiry (optional)"><DatePicker id="suppression-expiry" date={form.expiresAt} minDate={new Date(Date.now() + 86_400_000)} onSelect={(expiresAt) => setForm({ ...form, expiresAt })} placeholder="No expiry" /></Field></div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => create.mutate({ ...form, expiresAt: form.expiresAt ?? null })} disabled={create.isPending || !form.destination.trim()}>{create.isPending ? <Loader2 className="animate-spin" /> : <Ban />}Suppress</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}

function Field(props: { id: string; label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label htmlFor={props.id}>{props.label}</Label>{props.children}</div>; }
