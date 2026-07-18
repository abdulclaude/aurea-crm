import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PublishedFormHoneypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="absolute left-[-10000px] top-auto size-px overflow-hidden">
      <Label htmlFor="publication-form-website">Website</Label>
      <Input
        id="publication-form-website"
        name="website"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  );
}
