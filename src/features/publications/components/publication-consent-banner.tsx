"use client";

import { Button } from "@/components/ui/button";
import type { PublicationConsentConfig } from "@/features/publications/contracts";
import { buildPublicationConsentCookie } from "@/features/publications/public/consent";

export function PublicationConsentBanner({
  config,
  targetId,
}: {
  config: PublicationConsentConfig;
  targetId: string;
}) {
  const save = (categories: readonly string[]) => {
    const value = encodeURIComponent(
      JSON.stringify({ version: config.version, categories }),
    );
    document.cookie = buildPublicationConsentCookie({
      targetId,
      value,
      secure: window.location.protocol === "https:",
    });
    window.location.reload();
  };

  return (
    <aside
      aria-label="Privacy choices"
      className="fixed inset-x-0 bottom-0 z-[10000] border-t bg-background px-4 py-4 text-foreground shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium">Privacy choices</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose whether this page may use analytics and marketing services.
            {config.privacyPolicyUrl ? (
              <>
                {" "}
                <a
                  className="underline underline-offset-2"
                  href={config.privacyPolicyUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Privacy policy
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => save([])}>
            Necessary only
          </Button>
          <Button onClick={() => save(config.categories)}>Accept all</Button>
        </div>
      </div>
    </aside>
  );
}
