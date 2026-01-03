"use client";

import { Suspense, use } from "react";
import { LoaderCircle } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";
import { CampaignStats } from "@/features/campaigns/components/campaign-stats";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

function CampaignContent({ id }: { id: string }) {
  const trpc = useTRPC();

  const { data: campaign } = useSuspenseQuery(
    trpc.campaigns.get.queryOptions({ id })
  );

  if (!campaign) {
    notFound();
  }

  // If campaign is sent, show stats view instead of edit form
  if (campaign.status === "SENT") {
    return <CampaignStats campaign={campaign} />;
  }

  return (
    <CampaignForm
      campaignId={id}
      initialData={{
        name: campaign.name,
        subject: campaign.subject,
        preheaderText: campaign.preheaderText,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        emailDomainId: campaign.emailDomainId,
        resendTemplateId: campaign.resendTemplateId,
        segmentType: campaign.segmentType,
        segmentFilter: campaign.segmentFilter,
        content: campaign.content,
        status: campaign.status,
      }}
    />
  );
}

export default function CampaignPage({ params }: PageProps) {
  const resolvedParams = use(params);
  
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <CampaignContent id={resolvedParams.id} />
      </Suspense>
    </div>
  );
}
