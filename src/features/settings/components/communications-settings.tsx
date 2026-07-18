"use client";

import * as React from "react";

import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { CommunicationsUsage } from "@/features/communications/components/communications-usage";
import { ManagedEmailSettings } from "@/features/communications/components/managed-email-settings";
import { ManagedSmsSettings } from "@/features/communications/components/managed-sms-settings";
import { ManagedVoiceSettings } from "@/features/communications/components/managed-voice-settings";
import { CommunicationRulesSettings } from "@/features/communications/components/communication-rules-settings";
import { CommunicationSuppressionsSettings } from "@/features/communications/components/communication-suppressions-settings";
import { MailboxBlocklistSettings } from "@/features/communications/components/mailbox-blocklist-settings";
import { InboxRouteSettings } from "@/features/inbox/components/inbox-route-settings";

const tabs = [
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "voice", label: "Voice" },
  { id: "inbox", label: "Inbox" },
  { id: "rules", label: "Rules" },
  { id: "suppressions", label: "Suppressions" },
  { id: "blocklist", label: "Blocklist" },
  { id: "usage", label: "Usage" },
] as const;

type CommunicationsTab = (typeof tabs)[number]["id"];

export function CommunicationsSettings() {
  const [activeTab, setActiveTab] = React.useState<CommunicationsTab>("email");
  return (
    <div>
      <div className="p-6">
        <h1 className="text-lg font-semibold text-primary">Communications</h1>
      </div>
      <Separator />
      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as CommunicationsTab)}
        className="px-6"
        ariaLabel="Communication settings"
        idPrefix="communication-settings"
      />
      {tabs.map((tab) => (
        <PageTabPanel
          key={tab.id}
          idPrefix="communication-settings"
          tabId={tab.id}
          activeTab={activeTab}
          className="max-w-5xl p-6"
        >
          {activeTab === tab.id ? <TabContent tab={tab.id} /> : null}
        </PageTabPanel>
      ))}
    </div>
  );
}

function TabContent({ tab }: { tab: CommunicationsTab }) {
  if (tab === "email") return <ManagedEmailSettings />;
  if (tab === "sms") return <ManagedSmsSettings />;
  if (tab === "voice") return <ManagedVoiceSettings />;
  if (tab === "inbox") return <InboxRouteSettings />;
  if (tab === "rules") return <CommunicationRulesSettings />;
  if (tab === "suppressions") return <CommunicationSuppressionsSettings />;
  if (tab === "blocklist") return <MailboxBlocklistSettings />;
  return <CommunicationsUsage />;
}
