"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Palette, PanelsTopLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateWidgetDialog } from "@/features/studio/widgets/create-widget-dialog";
import { WidgetCard } from "@/features/studio/widgets/widget-card";
import { useTRPC } from "@/trpc/client";

export function WidgetsPageContent(): React.JSX.Element {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const widgets = useQuery(trpc.widgets.list.queryOptions());
  const capabilities = useQuery(trpc.permissions.getCurrent.queryOptions());
  const update = useMutation(trpc.widgets.update.mutationOptions());
  const remove = useMutation(trpc.widgets.delete.mutationOptions());
  const canManage =
    capabilities.data?.capabilities.includes("publication.manage") ?? false;

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries(trpc.widgets.list.queryOptions());
  }

  async function copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Embed code copied");
    } catch {
      toast.error("Could not copy to the clipboard");
    }
  }

  return (
    <div className="min-w-0">
      <header className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h1 className="text-xl font-semibold">Website widgets</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            Configure reusable website experiences, preview saved drafts at any
            screen size, then publish secure embed code to approved origins.
          </p>
        </div>
        {canManage ? <CreateWidgetDialog /> : null}
      </header>
      <Separator />

      <section className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Publication style presets control colours and typography in each widget.
          </p>
        </div>
        <Card className="p-0 [&>div]:gap-4 [&>div]:p-5 sm:[&>div]:flex-row sm:[&>div]:items-center sm:[&>div]:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/35">
              <Palette className="size-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Widget styles</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Create reusable brand presets, then select one when publishing a widget.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/styles">
              Manage styles
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </Card>
      </section>

      <Separator />
      <section className="space-y-5 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Your widgets</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft previews show current saved content; published embeds stay immutable.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings/publication">Publishing</Link>
          </Button>
        </div>

        {widgets.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-[340px] rounded-2xl" />
            ))}
          </div>
        ) : widgets.error ? (
          <Card className="p-0 text-center [&>div]:items-center [&>div]:p-10">
            <p className="text-sm font-medium">Widgets unavailable</p>
            <p className="mt-1 text-xs text-destructive">{widgets.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void widgets.refetch()}>
              Try again
            </Button>
          </Card>
        ) : widgets.data?.widgets.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {widgets.data.widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                canManage={canManage}
                mutationPending={update.isPending || remove.isPending}
                onCopy={copy}
                onActiveChange={async (isActive) => {
                  try {
                    await update.mutateAsync({ id: widget.id, isActive });
                    await refresh();
                    toast.success(
                      isActive
                        ? "Widget enabled"
                        : "Widget disabled and publication paused",
                    );
                  } catch {
                    toast.error("Could not update widget status");
                  }
                }}
                onDelete={async () => {
                  try {
                    await remove.mutateAsync({
                      id: widget.id,
                      archivePublication: true,
                    });
                    await refresh();
                    toast.success("Widget deleted");
                  } catch {
                    toast.error("Failed to delete widget");
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="p-0 text-center [&>div]:items-center [&>div]:p-10">
            <div className="flex size-11 items-center justify-center rounded-xl border bg-muted/35">
              <PanelsTopLeft className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold">Create your first widget</h3>
            <p className="max-w-md text-xs leading-5 text-muted-foreground">
              Choose an experience, configure its content, and preview it before publishing.
            </p>
            {canManage ? <CreateWidgetDialog /> : null}
          </Card>
        )}
      </section>
    </div>
  );
}
