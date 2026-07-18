import { PricingOptionDetailPageClient } from "@/features/studio/components/pricing-options/detail/pricing-option-detail-page-client";

export default async function PricingOptionDetailPage({
  params,
}: {
  params: Promise<{ pricingOptionId: string }>;
}) {
  const { pricingOptionId } = await params;
  return <PricingOptionDetailPageClient pricingOptionId={pricingOptionId} />;
}
