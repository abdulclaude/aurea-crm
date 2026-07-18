"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CompletionRing } from "@/features/studio/components/launchpad/launchpad-progress";
import { cn } from "@/lib/utils";
import {
  Rocket,
  Building2,
  Users,
  CreditCard,
  CalendarDays,
  Tag,
  Globe,
  ChevronLeft,
  CheckCircle2,
  Lock,
  CalendarCheck2,
  WalletCards,
} from "lucide-react";

export default function LaunchpadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();

  const { data: progress } = useQuery(trpc.launchpad.progress.queryOptions());
  const hasRooms = progress?.hasRooms ?? false;
  const hasClassTypes = progress?.hasClassTypes ?? false;
  const hasInstructors = progress?.hasInstructors ?? false;
  const canScheduleClass = hasRooms && hasClassTypes && hasInstructors;

  const sections = [
    {
      title: "Foundation",
      items: [
        {
          title: "Studio profile",
          href: "/settings/workspace",
          icon: Building2,
          isComplete: true,
          locked: false,
        },
        {
          title: "Rooms & spaces",
          href: "/launchpad/rooms",
          icon: Globe,
          isComplete: hasRooms,
          locked: false,
        },
        {
          title: "Class types",
          href: "/launchpad/class-types",
          icon: Tag,
          isComplete: hasClassTypes,
          locked: false,
        },
      ],
    },
    {
      title: "Business setup",
      items: [
        {
          title: "Instructors",
          href: "/launchpad/instructors",
          icon: Users,
          isComplete: hasInstructors,
          locked: false,
        },
        {
          title: "Pricing",
          href: "/studio/pricing-options/new",
          icon: WalletCards,
          isComplete: progress?.hasValidPricing ?? false,
          locked: false,
        },
      ],
    },
    {
      title: "Go live",
      items: [
        {
          title: "Bookable class",
          href: "/launchpad/first-class",
          icon: CalendarDays,
          isComplete: progress?.hasFutureBookableClass ?? false,
          locked: !canScheduleClass,
        },
        {
          title: "Publication",
          href: "/settings/publication",
          icon: CalendarCheck2,
          isComplete: progress?.hasPublishedBookingSurface ?? false,
          locked: false,
        },
        {
          title: "Payments",
          href: "/settings/payments",
          icon: CreditCard,
          isComplete:
            !(progress?.paymentProviderRequired ?? false) ||
            (progress?.paymentProviderReady ?? false),
          locked: false,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-black/5 dark:border-white/5 p-4 h-14 bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 border-none"
          >
            <ChevronLeft className="size-3" />
            Go back
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-black/5 dark:border-white/5 bg-background overflow-y-auto">
          <nav className="p-4 space-y-6">
            {/* Overview */}
            <div>
              <Link href="/launchpad">
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-semibold transition-colors tracking-tight",
                    pathname === "/launchpad"
                      ? "bg-primary-foreground/75 text-primary"
                      : "text-primary/60 hover:bg-primary-foreground/75 hover:text-primary",
                  )}
                >
                  <Rocket className="h-4 w-4" />
                  Overview
                </div>
              </Link>
            </div>

            {sections.map((section) => {
              const sectionCompleted = section.items.filter(
                (i) => i.isComplete,
              ).length;
              const sectionPct = Math.round(
                (sectionCompleted / section.items.length) * 100,
              );

              return (
                <div key={section.title} className="space-y-1">
                  <div className="flex items-center justify-between px-3 mb-2">
                    <h3 className="text-xs font-medium text-primary/50">
                      {section.title}
                    </h3>
                    <CompletionRing percentage={sectionPct} size={14} />
                  </div>

                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    const rowContent = (
                      <div
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-semibold transition-colors tracking-tight",
                          isActive
                            ? "bg-primary-foreground/75 text-primary"
                            : item.isComplete
                              ? "text-green-600 dark:text-green-400 bg-green-500/5 hover:bg-green-500/10"
                              : item.locked
                                ? "text-primary/30 cursor-not-allowed"
                                : "text-primary/60 hover:bg-primary-foreground/75 hover:text-primary",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive
                              ? "text-primary"
                              : item.isComplete
                                ? "text-green-500"
                                : item.locked
                                  ? "text-primary/20"
                                  : "",
                          )}
                        />
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.isComplete ? (
                          <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                        ) : item.locked ? (
                          <Lock className="size-3 text-primary/20 shrink-0" />
                        ) : null}
                      </div>
                    );

                    if (item.locked) {
                      return <div key={item.href}>{rowContent}</div>;
                    }
                    return (
                      <Link key={item.href} href={item.href}>
                        {rowContent}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto flex flex-col">{children}</main>
      </div>
    </div>
  );
}
