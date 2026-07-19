"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { PublicationTarget } from "@/features/publications/components/publication-ui-types";
import { useTRPC } from "@/trpc/client";

export function PublicationEmbedPanel({
  target,
}: {
  target: PublicationTarget;
}): React.JSX.Element | null {
  const trpc = useTRPC();
  const embed = useQuery({
    ...trpc.publications.getFormEmbedCode.queryOptions({ id: target.id }),
    enabled: target.kind === "FORM" && target.status === "PUBLISHED",
    retry: false,
  });

  if (target.kind !== "FORM") return null;

  async function copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy to the clipboard");
    }
  }

  return (
    <section className="border-b p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Share form</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Open the public form directly or embed it on an approved website.
          </p>
        </div>
        {embed.data ? (
          <Button asChild variant="outline" size="sm">
            <Link href={embed.data.previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              Preview
            </Link>
          </Button>
        ) : null}
      </div>
      {target.status !== "PUBLISHED" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Publish this form before copying embed code.
        </p>
      ) : embed.isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading share links...</p>
      ) : embed.data ? (
        <div className="mt-4 space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium">Public link</p>
            <div className="relative">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 pr-10 font-mono text-xs">
                {embed.data.previewUrl}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 size-8"
                aria-label="Copy public form link"
                title="Copy public link"
                onClick={() => void copy(embed.data.previewUrl)}
              >
                <Copy aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium">Website embed</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The iframe only loads on exact website origins in the published
              version.
            </p>
            {embed.data.iframeCode ? (
              <div className="relative mt-2">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 pr-10 font-mono text-xs">
                  {embed.data.iframeCode}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 size-8"
                  aria-label="Copy form embed code"
                  title="Copy embed code"
                  onClick={() => void copy(embed.data.iframeCode ?? "")}
                >
                  <Copy aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Add at least one allowed website origin, save, and republish to
                generate iframe code.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Share links could not be loaded.
        </p>
      )}
    </section>
  );
}
