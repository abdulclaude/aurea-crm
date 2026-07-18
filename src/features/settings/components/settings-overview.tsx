"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";

import { useSettingsSections } from "../hooks/use-settings-sections";
import { filterSettingsSections } from "../lib/settings-registry";
import type { SettingsSectionId } from "../types";

export function SettingsOverview() {
  const sections = useSettingsSections();
  const [selectedSection, setSelectedSection] = React.useState<
    SettingsSectionId | "all"
  >("all");
  const [query, setQuery] = React.useState("");

  const tabs = React.useMemo(
    () => [
      { id: "all", label: "All settings" },
      ...sections.map((section) => ({
        id: section.id,
        label: section.title,
      })),
    ],
    [sections],
  );

  const activeSection =
    selectedSection === "all" ||
    sections.some((section) => section.id === selectedSection)
      ? selectedSection
      : "all";

  const visibleSections = React.useMemo(
    () =>
      filterSettingsSections({
        sections,
        sectionId: activeSection,
        query,
      }),
    [activeSection, query, sections],
  );

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Settings</h1>
          <p className="text-xs text-primary/70">
            Configure your workspace, providers, public experiences, and operations.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-primary/40"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search settings"
            placeholder="Search settings..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <Separator />

      <PageTabs
        tabs={tabs}
        activeTab={activeSection}
        onTabChange={(sectionId) =>
          setSelectedSection(sectionId as SettingsSectionId | "all")
        }
        className="px-6"
        ariaLabel="Settings categories"
        idPrefix="settings-overview"
      />

      {tabs.map((tab) => (
        <PageTabPanel
          key={tab.id}
          idPrefix="settings-overview"
          tabId={tab.id}
          activeTab={activeSection}
          className="p-6"
        >
          {tab.id === activeSection && visibleSections.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleSections.map((section) => {
              const SectionIcon = section.icon;

              return (
                <Card key={section.id} className="h-full shadow-none">
                  <CardHeader>
                    <CardTitle role="heading" aria-level={2} className="text-sm">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-xs leading-5">
                      {section.description}
                    </CardDescription>
                    <CardAction>
                      <SectionIcon
                        aria-hidden="true"
                        className="size-4 text-primary/50"
                      />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="divide-y divide-black/5 dark:divide-white/5">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className="group flex min-h-16 items-start gap-3 px-6 py-3.5 transition-colors hover:bg-primary-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <ItemIcon
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-primary/50"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-medium text-primary">
                                {item.title}
                              </span>
                              <span className="mt-1 block text-[11px] leading-4 text-primary/60">
                                {item.description}
                              </span>
                            </span>
                            <ArrowRight
                              aria-hidden="true"
                              className="mt-0.5 size-3.5 shrink-0 text-primary/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary/60"
                            />
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          ) : tab.id === activeSection ? (
            <div className="flex min-h-56 items-center justify-center border-y border-black/5 px-6 text-center text-xs text-primary/50 dark:border-white/5">
              No settings match your search.
            </div>
          ) : null}
        </PageTabPanel>
      ))}
    </div>
  );
}
