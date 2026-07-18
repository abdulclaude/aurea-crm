import { MemberProfilePageClient } from "@/features/crm/components/member-profile-page-client";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  return <MemberProfilePageClient memberId={clientId} />;
}
