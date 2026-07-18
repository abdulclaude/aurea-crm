import { createId } from "@paralleldrive/cuid2";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ContentLibraryPayload } from "@/features/content-settings/contracts";

type Payload = Extract<ContentLibraryPayload, { kind: "FAQ_COLLECTION" }>;

export function FaqEditor({ value, onChange }: { value: Payload; onChange: (value: Payload) => void }): React.JSX.Element {
  const update = (index: number, patch: Partial<Payload["entries"][number]>): void => {
    onChange({ ...value, entries: value.entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry) });
  };
  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <legend className="text-xs font-medium">Questions</legend>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, entries: [...value.entries, { id: createId(), question: "", answer: "", sortOrder: value.entries.length, isVisible: true }] })}>
          <Plus className="size-3.5" /> Add question
        </Button>
      </div>
      {value.entries.length === 0 ? <p className="border-t pt-3 text-xs text-muted-foreground">No questions added.</p> : null}
      {value.entries.map((entry, index) => (
        <div key={entry.id} className="space-y-2 border-t pt-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor={`faq-question-${entry.id}`}>Question</Label>
              <Input id={`faq-question-${entry.id}`} value={entry.question} onChange={(event) => update(index, { question: event.target.value })} required />
            </div>
            <div className="flex h-9 items-center gap-2">
              <Switch id={`faq-visible-${entry.id}`} checked={entry.isVisible} onCheckedChange={(checked) => update(index, { isVisible: checked })} />
              <Label htmlFor={`faq-visible-${entry.id}`}>Visible</Label>
            </div>
            <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${entry.question || "question"}`} onClick={() => onChange({ ...value, entries: value.entries.filter((candidate) => candidate.id !== entry.id).map((candidate, sortOrder) => ({ ...candidate, sortOrder })) })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Label htmlFor={`faq-answer-${entry.id}`}>Answer</Label>
          <Textarea id={`faq-answer-${entry.id}`} value={entry.answer} onChange={(event) => update(index, { answer: event.target.value })} required />
        </div>
      ))}
    </fieldset>
  );
}
