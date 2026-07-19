"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type {
  EmailDesignSettings,
  EmailSocialLinks,
} from "@/features/communications/email-settings-contracts";

const platforms = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["x", "X (formerly Twitter)"],
  ["pinterest", "Pinterest"],
  ["youtube", "YouTube"],
  ["linkedin", "LinkedIn"],
] as const;

export function EmailSocialLinksSettings({
  value,
  onChange,
}: {
  value: EmailDesignSettings;
  onChange: (value: EmailDesignSettings) => void;
}) {
  const updateLink = (
    platform: keyof EmailSocialLinks,
    url: string | null,
  ) =>
    onChange({
      ...value,
      socialLinks: { ...value.socialLinks, [platform]: url },
    });

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {platforms.map(([platform, label]) => {
        const enabled = value.socialLinks[platform] !== null;
        return (
          <div
            key={platform}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3"
          >
            <Checkbox
              id={`email-social-${platform}`}
              checked={enabled}
              onCheckedChange={(checked) =>
                updateLink(platform, checked ? "" : null)
              }
            />
            <div className="min-w-0">
              <label
                htmlFor={`email-social-${platform}`}
                className="text-xs font-medium"
              >
                {label}
              </label>
              {enabled ? (
                <Input
                  aria-label={`${label} URL`}
                  type="url"
                  className="mt-1.5 w-full"
                  value={value.socialLinks[platform] ?? ""}
                  onChange={(event) =>
                    updateLink(platform, event.target.value)
                  }
                  placeholder="https://"
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
