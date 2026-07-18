import { FileText } from "lucide-react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PublicationConsentBanner } from "@/features/publications/components/publication-consent-banner";
import { publicationConsentConfigSchema } from "@/features/publications/contracts";
import {
  publishedFormSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";
import {
  hasPublicationConsentDecision,
  publicationConsentCookieName,
} from "@/features/publications/public/consent";
import { PublishedFormClient } from "@/features/publications/public/published-form-client";
import { createPublicFormSubmissionToken } from "@/features/publications/public/form-submission-token";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

type PublishedFormStyle = React.CSSProperties & {
  "--publication-background": string;
  "--publication-button-text": string;
  "--publication-primary": string;
  "--publication-text": string;
};

export async function PublishedForm({
  snapshot,
  targetId,
  versionId,
  themeSnapshot,
  consentSnapshot,
}: {
  snapshot: unknown;
  targetId: string;
  versionId: string;
  themeSnapshot: unknown;
  consentSnapshot: unknown;
}): Promise<React.JSX.Element> {
  const envelope = storedPublicationSnapshotSchema.safeParse(snapshot);
  if (!envelope.success || envelope.data.channelConfig.kind !== "FORM") {
    notFound();
  }
  const source = publishedFormSourceSchema.safeParse(envelope.data.source);
  if (!source.success || !source.data.form) notFound();

  const consent = publicationConsentConfigSchema.parse(consentSnapshot);
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(
    publicationConsentCookieName(targetId),
  )?.value;
  const hasConsentDecision = hasPublicationConsentDecision({
    config: consent,
    cookieValue,
  });
  const { form } = source.data;
  const channel = envelope.data.channelConfig;
  const canAcceptResponses =
    channel.submissionMode === "ENABLED" && consent.privacyPolicyUrl !== null;
  const token = canAcceptResponses
    ? createPublicFormSubmissionToken({
        targetId,
        versionId,
        formId: form.id,
      })
    : null;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const formThemeStyle: PublishedFormStyle = {
    "--publication-primary": form.primaryColor,
    "--publication-button-text": form.buttonTextColor,
    "--publication-background": form.backgroundColor,
    "--publication-text": form.textColor,
    background: channel.transparentBackground ? "transparent" : undefined,
  };

  return (
    <main
      className="aurea-publication-root min-h-screen bg-[var(--publication-background,#fff)] text-[var(--publication-text,#111827)]"
      style={formThemeStyle}
    >
      {themeCss ? (
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      ) : null}
      <header className="border-b border-[var(--publication-border,#e5e7eb)] px-4 py-6">
        <div className="mx-auto flex max-w-2xl items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--publication-border,#e5e7eb)]">
            <FileText className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-lg font-semibold">{form.name}</h1>
            {form.description ? (
              <p className="mt-1 break-words text-sm opacity-70">
                {form.description}
              </p>
            ) : null}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <PublishedFormClient
          source={source.data}
          targetId={targetId}
          versionId={versionId}
          token={token}
          responseConsentLabel={channel.responseConsentLabel}
          privacyPolicyUrl={consent.privacyPolicyUrl ?? ""}
        />
      </div>
      {consent.mode === "REQUIRED" && !hasConsentDecision ? (
        <PublicationConsentBanner config={consent} targetId={targetId} />
      ) : null}
    </main>
  );
}
