"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import type { CommunicationRuleListItem } from "./communication-control-types";

type RuleForm = {
  name: string;
  eventKey: string;
  channel: "EMAIL" | "SMS";
  purpose: "MARKETING" | "TRANSACTIONAL" | "ONE_TO_ONE" | "SYSTEM";
  enabled: boolean;
  offset: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  changeNote: string;
};

const EMPTY_FORM: RuleForm = {
  name: "",
  eventKey: "",
  channel: "EMAIL",
  purpose: "TRANSACTIONAL",
  enabled: true,
  offset: "0",
  subject: "",
  textBody: "",
  htmlBody: "",
  changeNote: "",
};

function formFromRule(rule: CommunicationRuleListItem | null): RuleForm {
  if (!rule) return EMPTY_FORM;
  return {
    name: rule.name,
    eventKey: rule.eventKey,
    channel: rule.channel === "SMS" ? "SMS" : "EMAIL",
    purpose: rule.purpose,
    enabled: rule.isEnabled ?? false,
    offset: String(rule.scheduleOffsetMinutes ?? 0),
    subject: rule.subject ?? "",
    textBody: rule.textBody ?? "",
    htmlBody: rule.htmlBody ?? "",
    changeNote: "",
  };
}

export function CommunicationRuleEditor(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: CommunicationRuleListItem | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [preview, setPreview] = useState<{
    subject: string | null;
    textBody: string | null;
    htmlBody: string | null;
  } | null>(null);
  useEffect(() => {
    if (props.open) {
      setForm(formFromRule(props.rule));
      setPreview(null);
    }
  }, [props.open, props.rule]);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.communications.listRules.queryKey(),
    });
  };
  const create = useMutation(
    trpc.communications.createRule.mutationOptions({
      onSuccess: async () => {
        toast.success("Communication rule created");
        props.onOpenChange(false);
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const version = useMutation(
    trpc.communications.versionRule.mutationOptions({
      onSuccess: async () => {
        toast.success("New rule version published");
        props.onOpenChange(false);
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const previewMutation = useMutation(
    trpc.communications.previewRule.mutationOptions({
      onSuccess: setPreview,
      onError: (error) => toast.error(error.message),
    }),
  );

  const content = () =>
    form.channel === "EMAIL"
      ? {
          channel: "EMAIL" as const,
          purpose: form.purpose,
          isEnabled: form.enabled,
          scheduleOffsetMinutes: Number(form.offset),
          subject: form.subject,
          textBody: form.textBody.trim() || null,
          htmlBody: form.htmlBody.trim() || null,
          changeNote: form.changeNote.trim() || null,
        }
      : {
          channel: "SMS" as const,
          purpose: form.purpose,
          isEnabled: form.enabled,
          scheduleOffsetMinutes: Number(form.offset),
          subject: null,
          textBody: form.textBody,
          htmlBody: null,
          changeNote: form.changeNote.trim() || null,
        };

  const submit = () => {
    if (props.rule) {
      version.mutate({
        ruleId: props.rule.id,
        expectedVersion: props.rule.currentVersion,
        values: content(),
      });
    } else {
      create.mutate({ name: form.name, eventKey: form.eventKey, ...content() });
    }
  };
  const showPreview = () =>
    previewMutation.mutate({
      subject: form.channel === "EMAIL" ? form.subject : null,
      textBody: form.textBody || null,
      htmlBody: form.channel === "EMAIL" ? form.htmlBody || null : null,
      variables: {
        "client.name": "Sample customer",
        "event.name": "Sample event",
        "location.name": "Sample location",
      },
    });
  const busy = create.isPending || version.isPending;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.rule ? "Edit rule" : "New communication rule"}</DialogTitle>
          <DialogDescription>
            Saving creates an immutable version used by future deliveries.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="rule-name" label="Name">
            <Input id="rule-name" value={form.name} disabled={Boolean(props.rule)} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field id="rule-event" label="Event key">
            <Input id="rule-event" value={form.eventKey} disabled={Boolean(props.rule)} placeholder="booking.confirmed" onChange={(e) => setForm({ ...form, eventKey: e.target.value.toLowerCase() })} />
          </Field>
          <Field id="rule-channel" label="Channel">
            <Select value={form.channel} disabled={Boolean(props.rule)} onValueChange={(channel) => setForm({ ...form, channel: channel as RuleForm["channel"] })}>
              <SelectTrigger id="rule-channel" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="SMS">Text message</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field id="rule-purpose" label="Purpose">
            <Select value={form.purpose} onValueChange={(purpose) => setForm({ ...form, purpose: purpose as RuleForm["purpose"] })}>
              <SelectTrigger id="rule-purpose" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{["TRANSACTIONAL", "SYSTEM", "ONE_TO_ONE", "MARKETING"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ").toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="rule-offset" label="Schedule offset (minutes)">
            <Input id="rule-offset" type="number" value={form.offset} onChange={(e) => setForm({ ...form, offset: e.target.value })} />
          </Field>
          <div className="flex items-end gap-2 pb-2"><Switch id="rule-enabled" checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} /><Label htmlFor="rule-enabled">Enabled</Label></div>
        </div>
        {form.channel === "EMAIL" ? <Field id="rule-subject" label="Subject"><Input id="rule-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field> : null}
        <Field id="rule-text" label={form.channel === "SMS" ? "Message" : "Text body"}><Textarea id="rule-text" rows={5} value={form.textBody} onChange={(e) => setForm({ ...form, textBody: e.target.value })} /></Field>
        {form.channel === "EMAIL" ? <Field id="rule-html" label="HTML body"><Textarea id="rule-html" rows={6} value={form.htmlBody} onChange={(e) => setForm({ ...form, htmlBody: e.target.value })} /></Field> : null}
        <Field id="rule-note" label="Change note"><Input id="rule-note" value={form.changeNote} onChange={(e) => setForm({ ...form, changeNote: e.target.value })} /></Field>
        {preview ? <div className="space-y-2 border-t pt-4 text-xs"><p className="font-medium">Preview</p>{preview.subject ? <p><span className="text-muted-foreground">Subject: </span>{preview.subject}</p> : null}<pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-sm bg-muted p-3">{preview.textBody ?? preview.htmlBody}</pre></div> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={showPreview} disabled={previewMutation.isPending}><Eye />Preview</Button>
          <Button type="button" onClick={submit} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />}{props.rule ? "Publish version" : "Create rule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field(props: { id: string; label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={props.id}>{props.label}</Label>{props.children}</div>;
}
