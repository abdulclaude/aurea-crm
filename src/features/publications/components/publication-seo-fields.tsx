import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PublicationSeoConfig } from "@/features/publications/components/publication-ui-types";

export function PublicationSeoFields({
  config,
  onChange,
}: {
  config: PublicationSeoConfig;
  onChange: (config: PublicationSeoConfig) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="publication-seo-title">Page title</Label>
        <Input
          id="publication-seo-title"
          value={config.title ?? ""}
          onChange={(event) =>
            onChange({ ...config, title: event.target.value || null })
          }
          maxLength={120}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="publication-seo-description">Description</Label>
        <Textarea
          id="publication-seo-description"
          value={config.description ?? ""}
          onChange={(event) =>
            onChange({ ...config, description: event.target.value || null })
          }
          maxLength={320}
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="publication-seo-image">Social image URL</Label>
          <Input
            id="publication-seo-image"
            type="url"
            value={config.imageUrl ?? ""}
            onChange={(event) =>
              onChange({ ...config, imageUrl: event.target.value || null })
            }
            placeholder="https://"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publication-seo-canonical">Canonical URL</Label>
          <Input
            id="publication-seo-canonical"
            type="url"
            value={config.canonicalUrl ?? ""}
            onChange={(event) =>
              onChange({ ...config, canonicalUrl: event.target.value || null })
            }
            placeholder="https://"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 border-y py-3 sm:border-b-0">
          <Label htmlFor="publication-seo-index">Allow indexing</Label>
          <Switch
            id="publication-seo-index"
            checked={config.index}
            onCheckedChange={(index) => onChange({ ...config, index })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 border-b py-3 sm:border-y sm:border-b-0">
          <Label htmlFor="publication-seo-follow">Follow links</Label>
          <Switch
            id="publication-seo-follow"
            checked={config.follow}
            onCheckedChange={(follow) => onChange({ ...config, follow })}
          />
        </div>
      </div>
    </div>
  );
}
