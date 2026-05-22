"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Building2,
  Users,
  CreditCard,
  CalendarDays,
  Tag,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// ─── Completion ring (same design as sidebar) ─────────────────────────────────

function CompletionRing({ pct, size = 36 }: { pct: number; size?: number }) {
  const sw = 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const cx = size / 2;
  const color = pct >= 66 ? "#14b8a6" : pct >= 33 ? "#f59e0b" : "#ef4444";
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
    >
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={sw}
      />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Step interface ───────────────────────────────────────────────────────────

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  href?: string;
  locked?: boolean;
  lockReason?: string;
  alwaysDone?: boolean;
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step }: { step: Step }) {
  const Icon = step.icon;

  const inner = (
    <div
      className={cn(
        "w-full flex items-center gap-4 p-4 border rounded-xl transition-all text-left",
        step.isComplete || step.alwaysDone
          ? "border-green-500/20 bg-green-500/5"
          : step.locked
            ? "border-black/5 dark:border-white/5 bg-background opacity-50"
            : "border-black/5 dark:border-white/5 bg-background hover:border-primary/20",
      )}
    >
      <div
        className={cn(
          "size-10 rounded-lg flex items-center justify-center shrink-0",
          step.isComplete || step.alwaysDone
            ? "bg-green-500/10"
            : "bg-primary/5",
        )}
      >
        {step.locked ? (
          <Lock className="size-4 text-primary/30" />
        ) : (
          <Icon
            className={cn(
              "size-5",
              step.isComplete || step.alwaysDone
                ? "text-green-500"
                : "text-primary/50",
            )}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            step.isComplete || step.alwaysDone
              ? "text-green-600 dark:text-green-400"
              : "text-primary",
          )}
        >
          {step.title}
        </p>
        <p className="text-xs text-primary/50 mt-0.5">
          {step.locked && step.lockReason ? step.lockReason : step.description}
        </p>
      </div>
      <div className="shrink-0">
        {step.isComplete || step.alwaysDone ? (
          <CheckCircle2 className="size-5 text-green-500" />
        ) : step.locked ? (
          <Lock className="size-4 text-primary/20" />
        ) : (
          <ChevronRight className="size-4 text-primary/30" />
        )}
      </div>
    </div>
  );

  if (!step.locked && !step.alwaysDone && step.href) {
    return <Link href={step.href}>{inner}</Link>;
  }
  return inner;
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({ title, steps }: { title: string; steps: Step[] }) {
  const completed = steps.filter((s) => s.isComplete || s.alwaysDone).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary/60">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary/40 tabular-nums">
            {completed}/{steps.length}
          </span>
          <CompletionRing pct={pct} size={22} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LaunchpadPage() {
  const trpc = useTRPC();

  const { data: progress } = useQuery(trpc.launchpad.progress.queryOptions());

  const hasPlans = progress?.hasMembershipPlans ?? false;
  const hasRooms = progress?.hasRooms ?? false;
  const hasClassTypes = progress?.hasClassTypes ?? false;
  const hasInstructors = progress?.hasInstructors ?? false;
  const hasClasses = progress?.hasClasses ?? false;
  const canScheduleClass = hasRooms && hasClassTypes && hasInstructors;

  const categories: Array<{ id: string; title: string; steps: Step[] }> = [
    {
      id: "setup",
      title: "Studio setup",
      steps: [
        {
          id: "profile",
          title: "Studio profile",
          description: "Your studio was configured during onboarding.",
          icon: Building2,
          isComplete: true,
          alwaysDone: true,
        },
        {
          id: "rooms",
          title: "Add a room or space",
          description: "Create physical spaces for scheduling classes.",
          icon: Globe,
          isComplete: hasRooms,
          href: "/launchpad/rooms",
        },
        {
          id: "class-types",
          title: "Create class types",
          description: "Define the types of classes your studio offers.",
          icon: Tag,
          isComplete: hasClassTypes,
          href: "/launchpad/class-types",
        },
      ],
    },
    {
      id: "team",
      title: "Your team",
      steps: [
        {
          id: "instructors",
          title: "Add instructors",
          description: "Invite your instructors and set up their profiles.",
          icon: Users,
          isComplete: hasInstructors,
          href: "/launchpad/instructors",
        },
      ],
    },
    {
      id: "billing",
      title: "Billing",
      steps: [
        {
          id: "memberships",
          title: "Set up membership plans",
          description: "Create pricing plans for your members.",
          icon: CreditCard,
          isComplete: hasPlans,
          href: "/launchpad/memberships",
        },
      ],
    },
    {
      id: "go-live",
      title: "Go live",
      steps: [
        {
          id: "first-class",
          title: "Schedule your first class",
          description: "Create a class so members can start booking.",
          icon: CalendarDays,
          isComplete: hasClasses,
          href: "/launchpad/first-class",
          locked: !canScheduleClass,
          lockReason: !hasRooms
            ? "Complete studio setup first — add a room"
            : !hasClassTypes
              ? "Complete studio setup first — add a class type"
              : "Complete Your Team first — add an instructor",
        },
      ],
    },
  ];

  const allSteps = categories.flatMap((c) => c.steps);
  const completedCount = allSteps.filter(
    (s) => s.isComplete || s.alwaysDone,
  ).length;
  const overallPct = Math.round((completedCount / allSteps.length) * 100);

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-start justify-between p-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">
            Get your studio ready
          </h1>
          <p className="text-sm text-primary/50 mt-0.5">
            Complete these steps to launch and start accepting bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-primary tabular-nums">
              {overallPct}%
            </p>
            <p className="text-xs text-primary/40">
              {completedCount} of {allSteps.length} done
            </p>
          </div>
          <CompletionRing pct={overallPct} size={44} />
        </div>
      </div>

      <Separator className="w-full" />

      <div className="p-6 space-y-8">
        {/* Categories */}
        {categories.map((cat) => (
          <CategorySection key={cat.id} title={cat.title} steps={cat.steps} />
        ))}
      </div>
    </div>
  );
}
