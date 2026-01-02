import { VisitorProfileDetailWrapper } from "./visitor-profile-wrapper";

interface PageProps {
  params: Promise<{
    funnelId: string;
    anonymousId: string;
  }>;
}

export default async function VisitorProfilePage({ params }: PageProps) {
  const { funnelId, anonymousId } = await params;
  
  return <VisitorProfileDetailWrapper funnelId={funnelId} anonymousId={anonymousId} />;
}
