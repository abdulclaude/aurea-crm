"use client";

import { usePathname, useRouter } from "next/navigation";

import { PageTabs } from "@/components/ui/page-tabs";

type RouteTab = {
  id: string;
  label: string;
  href: string;
};

const routeTabGroups: RouteTab[][] = [
  [
    { id: "classes", label: "Classes", href: "/studio/classes" },
    {
      id: "class-series",
      label: "Class series",
      href: "/studio/class-series",
    },
  ],
  [
    {
      id: "service-types",
      label: "Service types",
      href: "/studio/service-types",
    },
    { id: "rooms", label: "Rooms", href: "/studio/rooms" },
  ],
  [
    { id: "members", label: "Members", href: "/clients" },
    { id: "households", label: "Households", href: "/households" },
  ],
  [
    {
      id: "account-credit",
      label: "Account credit",
      href: "/studio/account-credit",
    },
    {
      id: "gift-cards",
      label: "Gift cards",
      href: "/studio/gift-cards",
    },
    {
      id: "promo-codes",
      label: "Promo codes",
      href: "/studio/promo-codes",
    },
  ],
  [
    { id: "intro-offers", label: "Intro offers", href: "/intro-offers" },
    { id: "referrals", label: "Referrals", href: "/referrals" },
  ],
  [
    { id: "team", label: "Team", href: "/team" },
    {
      id: "sub-requests",
      label: "Sub requests",
      href: "/studio/substitutions",
    },
  ],
];

function matchesRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ContextualPageTabs(): React.JSX.Element | null {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = routeTabGroups.find((group) =>
    group.some((tab) => matchesRoute(pathname, tab.href)),
  );
  if (!tabs) return null;

  const activeTab = tabs.find((tab) => matchesRoute(pathname, tab.href));
  if (!activeTab) return null;

  return (
    <PageTabs
      tabs={tabs}
      activeTab={activeTab.id}
      onTabChange={(tabId) => {
        const tab = tabs.find((candidate) => candidate.id === tabId);
        if (tab) router.push(tab.href);
      }}
      className="shrink-0 bg-background px-4 md:px-6"
      ariaLabel="Related pages"
    />
  );
}
