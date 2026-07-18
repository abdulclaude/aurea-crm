"use client";

import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTabPanel } from "@/components/ui/page-tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

import {
  CommerceSettingsSection,
  ReadinessStatus,
} from "./commerce-settings-shared";
import type { CommerceSettingsSectionProps } from "./commerce-settings-types";

export function DocumentDefaultsSettingsSection({
  activeTab,
  settings,
  canManage,
  submit,
}: CommerceSettingsSectionProps): React.JSX.Element {
  const trpc = useTRPC();
  const saveDocuments = useMutation(
    trpc.commerceSettings.saveDocumentDefaults.mutationOptions(),
  );

  return (
    <PageTabPanel
      idPrefix="commerce-settings"
      tabId="documents"
      activeTab={activeTab}
      className="p-6"
    >
      <CommerceSettingsSection
        title="Document defaults"
        description="Defaults apply when later invoice and receipt generation adopts this setting."
      >
        <div className="flex items-center gap-2">
          <ReadinessStatus value={settings.readiness.documents} />
        </div>
        {canManage ? (
          <form
            className="grid gap-3 max-w-xl"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void submit(
                () =>
                  saveDocuments.mutateAsync({
                    invoicePrefix: String(data.get("prefix")) || null,
                    invoiceDueDays: data.get("due")
                      ? Number(data.get("due"))
                      : null,
                    invoiceFooter: String(data.get("invoiceFooter")) || null,
                    receiptFooter: String(data.get("receiptFooter")) || null,
                    defaultRevenueCategoryId: null,
                  }),
                "Document defaults saved",
              );
            }}
          >
            <Label htmlFor="document-invoice-prefix" className="sr-only">
              Invoice prefix
            </Label>
            <Input
              id="document-invoice-prefix"
              name="prefix"
              defaultValue={settings.documentDefaults?.invoicePrefix ?? ""}
              placeholder="Invoice prefix"
            />
            <Label htmlFor="document-due-days" className="sr-only">
              Payment due days
            </Label>
            <Input
              id="document-due-days"
              name="due"
              type="number"
              min="0"
              max="365"
              defaultValue={settings.documentDefaults?.invoiceDueDays ?? ""}
              placeholder="Payment due days"
            />
            <Label htmlFor="document-invoice-footer" className="sr-only">
              Invoice footer
            </Label>
            <Textarea
              id="document-invoice-footer"
              name="invoiceFooter"
              defaultValue={settings.documentDefaults?.invoiceFooter ?? ""}
              placeholder="Invoice footer"
            />
            <Label htmlFor="document-receipt-footer" className="sr-only">
              Receipt footer
            </Label>
            <Textarea
              id="document-receipt-footer"
              name="receiptFooter"
              defaultValue={settings.documentDefaults?.receiptFooter ?? ""}
              placeholder="Receipt footer"
            />
            <Button type="submit" disabled={saveDocuments.isPending}>
              <Save />
              Save document defaults
            </Button>
          </form>
        ) : null}
      </CommerceSettingsSection>
    </PageTabPanel>
  );
}
