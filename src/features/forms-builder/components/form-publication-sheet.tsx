"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PublicationEmbedPanel } from "@/features/publications/components/publication-embed-panel";
import { createInputForSource } from "@/features/publications/components/publication-ui-types";
import { useTRPC } from "@/trpc/client";

export function FormPublicationSheet({
  formId,
}: {
  formId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const sourceKey = `form:${formId}`;
  const targets = useQuery({
    ...trpc.publications.list.queryOptions({ kind: "FORM" }),
    enabled: open,
  });
  const targetSummary = targets.data?.find(
    (target) => target.sourceKey === sourceKey,
  );
  const target = useQuery({
    ...trpc.publications.get.queryOptions({ id: targetSummary?.id ?? "" }),
    enabled: open && Boolean(targetSummary?.id),
  });
  const inventory = useQuery({
    ...trpc.publications.sourceInventory.queryOptions(),
    enabled: open && targets.isSuccess && !targetSummary,
  });
  const create = useMutation(
    trpc.publications.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.publications.list.queryOptions({ kind: "FORM" }),
        );
        toast.success("Shareable form created");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const source = inventory.data?.find((item) => item.sourceKey === sourceKey);
  const manageUrl = `/settings/publication?sourceKey=${encodeURIComponent(sourceKey)}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" size="sm" className="w-max" variant="success">
          Publish &amp; share
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Publish and embed</SheetTitle>
          <SheetDescription>
            Create a versioned public form, restrict its allowed websites, and
            copy a sandboxed iframe.
          </SheetDescription>
        </SheetHeader>
        {targets.isLoading || target.isLoading ? (
          <p className="p-5 text-xs text-muted-foreground">
            Loading publication settings...
          </p>
        ) : target.data ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b p-5">
              <div>
                <p className="text-sm font-medium">{target.data.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {target.data.slug}
                </p>
              </div>
              <PublicationStatus status={target.data.status} />
            </div>
            <PublicationEmbedPanel target={target.data} />
            <div className="p-5">
              <Button asChild variant="outline" className="w-full">
                <Link href={manageUrl}>
                  <ExternalLink className="size-3" aria-hidden="true" />
                  Manage publication
                </Link>
              </Button>
            </div>
          </>
        ) : source ? (
          <div className="space-y-4 p-5">
            <div className="border rounded-lg bg-muted/20 p-4">
              <p className="text-sm font-medium">No publication yet</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Create a draft target, then configure consent, website origins,
                height, theme, and response collection before publishing.
              </p>
            </div>
            <Button
              type="button"
                  className="w-full"
                  variant="gradient"
              disabled={create.isPending}
              onClick={() => create.mutate(createInputForSource(source))}
            >
              <Send className="size-3" aria-hidden="true" />
              {create.isPending ? "Creating" : "Create shareable form"}
            </Button>
          </div>
        ) : inventory.isError || targets.isError ? (
          <p className="p-5 text-xs text-destructive">
            Publication settings could not be loaded.
          </p>
        ) : (
          <p className="p-5 text-xs text-muted-foreground">
            Loading the form source...
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PublicationStatus({
  status,
}: {
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
}) {
  return (
    <Badge
      variant="outline"
      className={
        status === "PUBLISHED"
          ? "ring-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "ring-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }
    >
      <span className="capitalize"> {status.toLowerCase()} </span>
    </Badge>
  );
}
