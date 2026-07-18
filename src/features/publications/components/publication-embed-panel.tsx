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
          <h3 className="text-sm font-semibold">Website embed</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The embed only loads on exact website origins in the published version.
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
        <p className="mt-3 text-xs text-muted-foreground">Loading embed code...</p>
      ) : embed.data ? (
        <div className="relative mt-3">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 pr-10 font-mono text-xs">
            {embed.data.iframeCode}
          </pre>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 size-8"
            aria-label="Copy form embed code"
            title="Copy embed code"
            onClick={() => void copy(embed.data.iframeCode)}
          >
            <Copy aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Add at least one allowed website origin, save, and republish this form.
        </p>
      )}
    </section>
  );
}
