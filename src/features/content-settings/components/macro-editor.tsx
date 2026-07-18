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
import type { ContentLibraryPayload } from "@/features/content-settings/contracts";

type Payload = Extract<ContentLibraryPayload, { kind: "MESSAGE_MACRO" }>;

export function MacroEditor({ value, onChange }: { value: Payload; onChange: (value: Payload) => void }): React.JSX.Element {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Message macro content</legend>
      <div className="space-y-1">
        <Label htmlFor="macro-channel">Channel</Label>
        <Select value={value.channel} onValueChange={(channel: Payload["channel"]) => onChange({ ...value, channel })}>
          <SelectTrigger id="macro-channel" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All channels</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="SMS">SMS</SelectItem>
            <SelectItem value="INBOX">Inbox</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="macro-tags">Tags</Label>
        <Input id="macro-tags" value={value.tags.join(", ")} onChange={(event) => onChange({ ...value, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="macro-content">Message</Label>
        <Textarea id="macro-content" className="min-h-36" value={value.content} onChange={(event) => onChange({ ...value, content: event.target.value })} required />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Switch id="macro-active" checked={value.isActive} onCheckedChange={(isActive) => onChange({ ...value, isActive })} />
        <Label htmlFor="macro-active">Available for insertion</Label>
      </div>
    </fieldset>
  );
}
