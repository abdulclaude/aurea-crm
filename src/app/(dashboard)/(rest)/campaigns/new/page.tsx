"use client";

import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { CampaignForm } from "@/features/campaigns/components/campaign-form";

function NewCampaignContent() {
  return <CampaignForm />;
}

export default function NewCampaignPage() {
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <NewCampaignContent />
      </Suspense>
    </div>
  );
}
