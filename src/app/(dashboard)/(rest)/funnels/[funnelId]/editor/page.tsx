import { FunnelEditor } from "@/features/funnel-builder/components/funnel-editor";

interface PageProps {
  params: Promise<{
    funnelId: string;
  }>;
  searchParams: Promise<{
    pageId?: string;
  }>;
}

export default async function FunnelEditorPage({
  params,
  searchParams,
}: PageProps) {
  const { funnelId } = await params;
  const { pageId } = await searchParams;

  return <FunnelEditor funnelId={funnelId} initialPageId={pageId} />;
}
