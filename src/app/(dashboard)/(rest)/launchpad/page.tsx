"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck2,
  CalendarDays,
  CreditCard,
  Globe,
  Tag,
  Users,
  WalletCards,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
  CompletionRing,
  LaunchpadSection,
  type LaunchpadStep,
} from "@/features/studio/components/launchpad/launchpad-progress";
import { useTRPC } from "@/trpc/client";

export default function LaunchpadPage() {
  const trpc = useTRPC();
  const { data: progress } = useQuery(trpc.launchpad.progress.queryOptions());

  const foundation: LaunchpadStep[] = [
    { id: "profile", title: "Studio profile", description: "Review your workspace details, timezone, and local currency.", icon: Building2, isComplete: progress?.hasStudioProfile ?? false, href: "/settings/workspace" },
    { id: "rooms", title: "Rooms and spaces", description: "Create the spaces used by your class schedule.", icon: Globe, isComplete: progress?.hasRooms ?? false, href: "/launchpad/rooms" },
    { id: "class-types", title: "Class types", description: "Define the services members can discover and book.", icon: Tag, isComplete: progress?.hasClassTypes ?? false, href: "/launchpad/class-types" },
    { id: "instructors", title: "Instructors", description: "Add the people who will deliver your classes.", icon: Users, isComplete: progress?.hasInstructors ?? false, href: "/launchpad/instructors" },
    { id: "pricing", title: "Local-currency pricing", description: progress?.currency ? `Create an active pricing option in ${progress.currency}.` : "Set a valid workspace currency, then create pricing.", icon: WalletCards, isComplete: progress?.hasValidPricing ?? false, href: "/studio/pricing-options/new" },
  ];
  const canScheduleClass = Boolean(progress?.hasRooms && progress.hasClassTypes && progress.hasInstructors);
  const goLive: LaunchpadStep[] = [
    {
      id: "future-class",
      title: "Future bookable class",
      description: "Schedule an upcoming class with online booking enabled.",
      icon: CalendarDays,
      isComplete: progress?.hasFutureBookableClass ?? false,
      href: "/launchpad/first-class",
      locked: !canScheduleClass,
      lockReason: "Add a room, class type, and instructor first.",
    },
    { id: "publication", title: "Published booking surface", description: "Publish a current schedule or an embeddable widget with allowed website origins.", icon: CalendarCheck2, isComplete: progress?.hasPublishedBookingSurface ?? false, href: "/settings/publication" },
    {
      id: "payments",
      title: "Payment processing",
      description: progress?.paymentProviderRequired ? "Complete the scoped Stripe account setup for paid public sales." : "Only required when paid public sales are enabled.",
      icon: CreditCard,
      isComplete: progress?.paymentProviderRequired ? (progress.paymentProviderReady ?? false) : true,
      href: "/settings/payments",
      optional: progress ? !progress.paymentProviderRequired : false,
    },
  ];
  const foundationProgress = progress?.foundation ?? { completed: 0, total: 5, percentage: 0 };
  const goLiveProgress = progress?.goLive ?? { completed: 0, total: 2, percentage: 0 };

  return (
    <div>
      <header className="flex items-start justify-between gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Studio launchpad</h1>
          <p className="mt-0.5 text-sm text-primary/50">Finish the foundation first, then verify what customers need to book.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums text-primary">{progress?.percentage ?? 0}%</p>
            <p className="text-xs text-primary/40">{progress?.completed ?? 0} of {progress?.total ?? 7} required</p>
          </div>
          <CompletionRing percentage={progress?.percentage ?? 0} size={44} />
        </div>
      </header>
      <Separator />
      <div className="space-y-8 p-6">
        <LaunchpadSection title="Foundation" description="The studio configuration used by staff and scheduling." steps={foundation} {...foundationProgress} />
        <LaunchpadSection title="Go-live readiness" description="Customer-facing checks that must stay healthy after setup." steps={goLive} {...goLiveProgress} />
      </div>
    </div>
  );
}
