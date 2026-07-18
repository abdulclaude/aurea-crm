import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isCommerceSettingsTab } from "@/features/commerce-settings/components/commerce-settings-tabs";
import { CommerceSettingsPage } from "@/features/commerce-settings/components/commerce-settings-page";

export const metadata: Metadata = {
  title: "Commerce settings",
  description: "Manage commerce definitions and readiness.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<React.JSX.Element> {
  const { section } = await params;
  if (!isCommerceSettingsTab(section)) notFound();
  return <CommerceSettingsPage initialTab={section} />;
}
