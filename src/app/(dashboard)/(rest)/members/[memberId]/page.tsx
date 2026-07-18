import { MemberProfilePageClient } from "@/features/crm/components/member-profile-page-client";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  return <MemberProfilePageClient memberId={memberId} />;
}
