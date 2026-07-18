import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Class schedule",
};

interface PageProps {
  searchParams: Promise<{
    publication?: string;
    publicationOrg?: string;
  }>;
}

export default async function EmbedSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (params.publication && params.publicationOrg) {
    redirect(
      `/p/${encodeURIComponent(params.publicationOrg)}/${encodeURIComponent(params.publication)}`,
    );
  }
  return (
    <main className="flex min-h-52 items-center justify-center p-4 text-sm text-muted-foreground">
      Schedule not available
    </main>
  );
}
