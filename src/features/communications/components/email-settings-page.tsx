"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { AddDomainDialog } from "@/features/email-domains/components/add-domain-dialog";

import { EmailDesignSettings } from "./email-design-settings";
import { SenderAddressDialog } from "./sender-address-dialog";
import { SenderAddressesTable } from "./sender-addresses-table";
import { SenderDomainsTable } from "./sender-domains-table";

const primaryTabs = [
  { id: "addresses-domains", label: "Addresses & domains" },
  { id: "design-details", label: "Design & details" },
] as const;

const addressTabs = [
  { id: "sender-domains", label: "Sender domains" },
  { id: "sender-addresses", label: "Sender addresses" },
] as const;

export function EmailSettingsPage() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(primaryTabs.map(({ id }) => id)).withDefault(
      "addresses-domains",
    ),
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(addressTabs.map(({ id }) => id)).withDefault(
      "sender-domains",
    ),
  );

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Email</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure senders, domain authentication, email design, and delivery
            tests.
          </p>
        </div>
        {tab === "addresses-domains" ? (
          view === "sender-addresses" ? (
            <SenderAddressDialog />
          ) : (
            <AddDomainDialog />
          )
        ) : null}
      </div>
      <Separator />
      <PageTabs
        tabs={primaryTabs}
        activeTab={tab}
        onTabChange={(value) =>
          void setTab(value as (typeof primaryTabs)[number]["id"])
        }
        className="px-6"
        ariaLabel="Email settings sections"
        idPrefix="email-settings"
      />

      <PageTabPanel
        idPrefix="email-settings"
        tabId="addresses-domains"
        activeTab={tab}
        className="w-full min-w-0"
      >
        <PageTabs
          tabs={addressTabs}
          activeTab={view}
          onTabChange={(value) =>
            void setView(value as (typeof addressTabs)[number]["id"])
          }
          className="px-6"
          ariaLabel="Email sender settings"
          idPrefix="email-senders"
        />
        <PageTabPanel
          idPrefix="email-senders"
          tabId="sender-domains"
          activeTab={view}
          className="w-full min-w-0"
        >
          <SenderDomainsTable />
        </PageTabPanel>
        <PageTabPanel
          idPrefix="email-senders"
          tabId="sender-addresses"
          activeTab={view}
          className="w-full min-w-0"
        >
          <SenderAddressesTable />
        </PageTabPanel>
      </PageTabPanel>

      <PageTabPanel
        idPrefix="email-settings"
        tabId="design-details"
        activeTab={tab}
        className="w-full min-w-0"
      >
        <EmailDesignSettings />
      </PageTabPanel>
    </div>
  );
}
