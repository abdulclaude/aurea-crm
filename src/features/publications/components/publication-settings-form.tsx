"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PublicationChannelFields } from "@/features/publications/components/publication-channel-fields";
import { PublicationConsentFields } from "@/features/publications/components/publication-consent-fields";
import { PublicationGeneralFields } from "@/features/publications/components/publication-general-fields";
import { PublicationSeoFields } from "@/features/publications/components/publication-seo-fields";
import {
  parseTargetConfigs,
  type PublicationTarget,
} from "@/features/publications/components/publication-ui-types";
import { updatePublicationTargetSchema } from "@/features/publications/contracts";
import { useTRPC } from "@/trpc/client";

type Props = {
  target: PublicationTarget;
  onChanged: () => Promise<void>;
};

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function PublicationSettingsForm({
  target,
  onChanged,
}: Props): React.JSX.Element {
  const trpc = useTRPC();
  const configs = React.useMemo(() => parseTargetConfigs(target), [target]);
  const [name, setName] = React.useState(target.name);
  const [slug, setSlug] = React.useState(target.slug);
  const [themePresetId, setThemePresetId] = React.useState<string | null>(
    target.themePresetId,
  );
  const [seoConfig, setSeoConfig] = React.useState(configs.seoConfig);
  const [consentConfig, setConsentConfig] = React.useState(
    configs.consentConfig,
  );
  const [channelConfig, setChannelConfig] = React.useState(
    configs.channelConfig,
  );
  const themes = useQuery(trpc.globalStyles.list.queryOptions());
  const update = useMutation(trpc.publications.update.mutationOptions());

  async function save(): Promise<void> {
    const parsed = updatePublicationTargetSchema.safeParse({
      id: target.id,
      name,
      slug,
      themePresetId,
      seoConfig,
      consentConfig,
      channelConfig,
    });
    if (!parsed.success) {
      toast.error("Review the publication settings", {
        description: parsed.error.issues[0]?.message,
      });
      return;
    }
    try {
      await update.mutateAsync(parsed.data);
      await onChanged();
      toast.success("Draft settings saved");
    } catch (error: unknown) {
      toast.error("Could not save draft settings", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div>
      <section className="p-5">
        <SectionHeading
          title="General"
          description="Name the target, control its Aurea URL, and select a versioned style preset."
        />
        <PublicationGeneralFields
          name={name}
          slug={slug}
          themePresetId={themePresetId}
          themes={(themes.data ?? []).map((theme) => ({
            id: theme.id,
            name: theme.name,
          }))}
          onNameChange={setName}
          onSlugChange={setSlug}
          onThemeChange={setThemePresetId}
        />
        {themes.error ? (
          <p className="mt-2 text-xs text-destructive">
            Theme presets are unavailable. Existing selection is preserved.
          </p>
        ) : null}
      </section>
      <Separator />
      <section className="p-5">
        <SectionHeading
          title="Channel"
          description="Set the public behavior for this target type."
        />
        <PublicationChannelFields
          config={channelConfig}
          onChange={setChannelConfig}
        />
      </section>
      <Separator />
      <section className="p-5">
        <SectionHeading
          title="Search and sharing"
          description="These values are copied into every immutable publication version."
        />
        <PublicationSeoFields config={seoConfig} onChange={setSeoConfig} />
      </section>
      <Separator />
      <section className="p-5">
        <SectionHeading
          title="Consent"
          description="Choose when non-essential tracking may run on public pages."
        />
        <PublicationConsentFields
          config={consentConfig}
          onChange={setConsentConfig}
        />
      </section>

      <div className="sticky bottom-0 flex justify-end border-t bg-background/95 p-4 backdrop-blur">
        <Button className="w-max" variant="gradient" onClick={() => void save()} disabled={update.isPending}>

          {update.isPending ? "Saving" : "Save draft"}
        </Button>
      </div>
    </div>
  );
}
