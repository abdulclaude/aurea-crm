"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageTab {
  id: string;
  label: string;
}

interface PageTabsProps {
  tabs: readonly PageTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  ariaLabel?: string;
  idPrefix?: string;
}

export function PageTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  ariaLabel = "Page sections",
  idPrefix,
}: PageTabsProps): React.JSX.Element {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const resolvedActiveTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id;

  const activateTab = (index: number): void => {
    const nextIndex = (index + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    onTabChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role={idPrefix ? "tablist" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-full gap-1 overflow-x-auto border-b border-black/5 dark:border-white/5",
        className,
      )}
    >
      {tabs.map((tab, index) => (
        <Button
          key={tab.id}
          type="button"
          ref={(node) => {
            tabRefs.current[index] = node;
          }}
          role={idPrefix ? "tab" : undefined}
          id={idPrefix ? `${idPrefix}-${tab.id}-tab` : undefined}
          aria-controls={idPrefix ? `${idPrefix}-${tab.id}-panel` : undefined}
          variant="ghost"
          size="sm"
          aria-selected={idPrefix ? resolvedActiveTab === tab.id : undefined}
          aria-pressed={idPrefix ? undefined : resolvedActiveTab === tab.id}
          tabIndex={idPrefix ? (resolvedActiveTab === tab.id ? 0 : -1) : undefined}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              activateTab(index + 1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              activateTab(index - 1);
            } else if (event.key === "Home") {
              event.preventDefault();
              activateTab(0);
            } else if (event.key === "End") {
              event.preventDefault();
              activateTab(tabs.length - 1);
            }
          }}
          className={cn(
            "-mb-px h-auto shrink-0 rounded-none border-b-2 bg-transparent px-3 py-2 text-xs font-medium shadow-none ring-0 transition-colors hover:bg-transparent hover:shadow-none hover:ring-0",
            resolvedActiveTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-primary",
          )}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

export function PageTabPanel({
  idPrefix,
  tabId,
  activeTab,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  idPrefix: string;
  tabId: string;
  activeTab: string;
}): React.JSX.Element {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-${tabId}-panel`}
      aria-labelledby={`${idPrefix}-${tabId}-tab`}
      hidden={activeTab !== tabId}
      tabIndex={0}
      className={className}
      {...props}
    />
  );
}
