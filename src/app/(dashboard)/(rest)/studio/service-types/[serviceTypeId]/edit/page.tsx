import { NewServiceTypePageClient } from "@/features/studio/components/service-catalog/new-service-type-page-client";

export default async function EditServiceTypePage({
  params,
}: {
  params: Promise<{ serviceTypeId: string }>;
}) {
  const { serviceTypeId } = await params;

  return <NewServiceTypePageClient serviceTypeId={serviceTypeId} />;
}
