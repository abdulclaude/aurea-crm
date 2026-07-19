import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { PublishedWidget } from "@/features/publications/public/published-widget";
import { caller } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Widget preview",
  robots: { index: false, follow: false },
};

export default async function WidgetPreviewPage({
  params,
}: {
  params: Promise<{ widgetId: string }>;
}) {
  const { widgetId } = await params;
  let preview: Awaited<ReturnType<typeof caller.widgets.getDraftPreview>>;
  try {
    preview = await caller.widgets.getDraftPreview({ id: widgetId });
  } catch (error: unknown) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-8 text-center text-foreground">
          <div className="max-w-sm">
            <h1 className="text-primary font-semibold">Preview unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error.message}
            </p>
          </div>
        </main>
      );
    }
    throw error;
  }

  return (
    <PublishedWidget
      organizationId={preview.organizationId}
      locationId={preview.locationId}
      sourceId={preview.sourceId}
      snapshot={preview.snapshot}
      themeSnapshot={preview.themeSnapshot}
    />
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
