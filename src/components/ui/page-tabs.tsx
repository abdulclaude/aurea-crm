"use client";

import { cn } from "@/lib/utils";

interface PageTab {
  id: string;
  label: string;
}

interface PageTabsProps {
  tabs: PageTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function PageTabs({ tabs, activeTab, onTabChange, className }: PageTabsProps) {
  return (
    <div className={cn("flex gap-1 border-b border-black/5 dark:border-white/5", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "-mb-px px-3 py-2 text-xs font-medium transition-colors border-b-2",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-primary"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
