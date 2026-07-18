"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RotateCcw, Search, ShieldBan } from "lucide-react";
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

type BlockForm = { matchType: "ADDRESS" | "DOMAIN"; value: string; reason: string; expiresAt?: Date };
const EMPTY: BlockForm = { matchType: "ADDRESS", value: "", reason: "" };

export function MailboxBlocklistSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BlockForm>(EMPTY);
  const list = useQuery(trpc.communications.listMailboxBlocklist.queryOptions({ query, includeInactive, limit: 100 }));
  const refresh = async () => queryClient.invalidateQueries({ queryKey: trpc.communications.listMailboxBlocklist.queryKey() });
  const create = useMutation(trpc.communications.createMailboxBlock.mutationOptions({ onSuccess: async () => { toast.success("Mailbox sender blocked"); setOpen(false); setForm(EMPTY); await refresh(); }, onError: (error) => toast.error(error.message) }));
  const revoke = useMutation(trpc.communications.revokeMailboxBlock.mutationOptions({ onSuccess: async () => { toast.success("Mailbox block removed"); await refresh(); }, onError: (error) => toast.error(error.message) }));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-medium">Mailbox blocklist</h2><p className="mt-1 text-xs text-muted-foreground">Ignore inbound email from specific addresses or whole domains before a conversation is created.</p></div><Button size="sm" onClick={() => setOpen(true)}><Plus />Block sender</Button></div>
    <div className="flex flex-wrap items-center gap-4"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search mailbox blocklist" className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search address, domain, or reason" /></div><div className="flex items-center gap-2"><Switch id="show-inactive-mailbox-blocks" checked={includeInactive} onCheckedChange={setIncludeInactive} /><Label htmlFor="show-inactive-mailbox-blocks">Show inactive</Label></div></div>
    {list.isLoading ? <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading mailbox blocklist</div> : null}
    {list.isError ? <p role="alert" className="text-xs text-destructive">{list.error.message}</p> : null}
    <div className="divide-y border-y">{list.data?.map((entry) => { const inactive = Boolean(entry.revokedAt) || Boolean(entry.expiresAt && entry.expiresAt <= new Date()); return <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><div className="flex items-center gap-2"><p className="text-sm font-medium">{entry.matchType === "DOMAIN" ? `@${entry.valueNormalized}` : entry.valueNormalized}</p><Badge variant="outline">{entry.matchType.toLowerCase()}</Badge>{inactive ? <Badge variant="secondary">Inactive</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{entry.reason}{entry.expiresAt ? ` · expires ${entry.expiresAt.toLocaleDateString()}` : " · no expiry"}</p></div>{!inactive ? <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate({ id: entry.id })}><RotateCcw />Remove</Button> : null}</div>; })}{list.data?.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No mailbox blocks match this view.</p> : null}</div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Block mailbox sender</DialogTitle><DialogDescription>Matching inbound messages are retained as ignored receipts for operations visibility.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="block-match-type">Match</Label><Select value={form.matchType} onValueChange={(matchType) => setForm({ ...form, matchType: matchType as BlockForm["matchType"] })}><SelectTrigger id="block-match-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ADDRESS">Exact address</SelectItem><SelectItem value="DOMAIN">Whole domain</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor="block-value">{form.matchType === "ADDRESS" ? "Email address" : "Domain"}</Label><Input id="block-value" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder={form.matchType === "ADDRESS" ? "sender@example.com" : "example.com"} /></div><div className="space-y-1.5 sm:col-span-2"><Label htmlFor="block-reason">Reason</Label><Input id="block-reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="block-expiry">Expiry (optional)</Label><DatePicker id="block-expiry" date={form.expiresAt} minDate={new Date(Date.now() + 86_400_000)} onSelect={(expiresAt) => setForm({ ...form, expiresAt })} placeholder="No expiry" /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => create.mutate({ ...form, expiresAt: form.expiresAt ?? null })} disabled={create.isPending || !form.value.trim() || !form.reason.trim()}>{create.isPending ? <Loader2 className="animate-spin" /> : <ShieldBan />}Block</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
