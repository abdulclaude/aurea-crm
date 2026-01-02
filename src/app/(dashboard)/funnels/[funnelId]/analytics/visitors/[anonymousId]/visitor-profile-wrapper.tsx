"use client";

import { VisitorProfileDetail } from "@/features/external-funnels/components/visitor-profile-detail";

interface VisitorProfileDetailWrapperProps {
  funnelId: string;
  anonymousId: string;
}

export function VisitorProfileDetailWrapper({ 
  funnelId, 
  anonymousId 
}: VisitorProfileDetailWrapperProps) {
  return (
    <div className="container mx-auto py-6">
      <VisitorProfileDetail 
        funnelId={funnelId} 
        anonymousId={anonymousId} 
      />
    </div>
  );
}
