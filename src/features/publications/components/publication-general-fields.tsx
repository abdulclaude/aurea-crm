import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  name: string;
  slug: string;
  themePresetId: string | null;
  themes: Array<{ id: string; name: string }>;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onThemeChange: (value: string | null) => void;
};

export function PublicationGeneralFields({
  name,
  slug,
  themePresetId,
  themes,
  onNameChange,
  onSlugChange,
  onThemeChange,
}: Props): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="publication-name">Name</Label>
        <Input
          id="publication-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={120}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="publication-slug">Public slug</Label>
        <Input
          id="publication-slug"
          value={slug}
          onChange={(event) => onSlugChange(event.target.value)}
          maxLength={120}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">/p/{slug || "..."}</p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="publication-theme">Theme preset</Label>
        <Select
          value={themePresetId ?? "NONE"}
          onValueChange={(value) =>
            onThemeChange(value === "NONE" ? null : value)
          }
        >
          <SelectTrigger id="publication-theme" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Source defaults</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
