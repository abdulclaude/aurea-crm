import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentLibraryPayload } from "@/features/content-settings/contracts";

type Payload = Extract<ContentLibraryPayload, { kind: "TERMINOLOGY_PACK" }>;

export function TerminologyEditor({
  value,
  onChange,
}: {
  value: Payload;
  onChange: (value: Payload) => void;
}): React.JSX.Element {
  const update = (index: number, patch: Partial<Payload["terms"][number]>): void => {
    onChange({
      ...value,
      terms: value.terms.map((term, termIndex) =>
        termIndex === index ? { ...term, ...patch } : term,
      ),
    });
  };
  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <legend className="text-xs font-medium">Terms</legend>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              ...value,
              terms: [...value.terms, { key: "", label: "", pluralLabel: "" }],
            })
          }
        >
          <Plus className="size-3.5" /> Add term
        </Button>
      </div>
      {value.terms.map((term, index) => (
        <div key={`${index}-${term.key}`} className="grid gap-2 border-t pt-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor={`term-key-${index}`}>Key</Label>
            <Input id={`term-key-${index}`} value={term.key} onChange={(event) => update(index, { key: event.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`term-label-${index}`}>Singular</Label>
            <Input id={`term-label-${index}`} value={term.label} onChange={(event) => update(index, { label: event.target.value })} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`term-plural-${index}`}>Plural</Label>
            <Input id={`term-plural-${index}`} value={term.pluralLabel} onChange={(event) => update(index, { pluralLabel: event.target.value })} required />
          </div>
          <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${term.key || "term"}`} disabled={value.terms.length === 1} onClick={() => onChange({ ...value, terms: value.terms.filter((_, termIndex) => termIndex !== index) })}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </fieldset>
  );
}
