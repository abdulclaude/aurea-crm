"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { SETTINGS_OVERVIEW_ITEM } from "../constants";
import { useSettingsSections } from "../hooks/use-settings-sections";
import { getActiveSettingsItemHref } from "../lib/settings-registry";

export function SettingsNavigation({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = useSettingsSections();
  const OverviewIcon = SETTINGS_OVERVIEW_ITEM.icon;
  const activeHref = getActiveSettingsItemHref(
    pathname,
    [
      SETTINGS_OVERVIEW_ITEM.href,
      ...sections.flatMap((section) =>
        section.items.map((item) => item.href),
      ),
    ],
  );
  const overviewActive = activeHref === SETTINGS_OVERVIEW_ITEM.href;

  return (
    <nav aria-label="Settings" className="space-y-6 p-4">
      <Link
        href={SETTINGS_OVERVIEW_ITEM.href}
        aria-current={overviewActive ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold transition-colors",
          overviewActive
            ? "bg-primary-foreground/75 text-primary"
            : "text-primary/60 hover:bg-primary-foreground/75 hover:text-primary",
        )}
      >
        <OverviewIcon aria-hidden="true" className="size-4" />
        {SETTINGS_OVERVIEW_ITEM.title}
      </Link>

      {sections.map((section) => (
        <div key={section.id} className="space-y-1">
          <h2 className="mb-2 px-3 text-xs font-medium text-primary/60">
            {section.title}
          </h2>
          {section.items.map((item) => {
            const active = activeHref === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary-foreground/75 text-primary"
                    : "text-primary/60 hover:bg-primary-foreground/75 hover:text-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
