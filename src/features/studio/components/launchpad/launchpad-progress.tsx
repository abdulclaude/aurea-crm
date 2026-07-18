import type { LucideIcon } from "lucide-react";
import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type LaunchpadStep = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  isComplete: boolean;
  href: string;
  locked?: boolean;
  lockReason?: string;
  optional?: boolean;
};

export function CompletionRing({
  percentage,
  size = 36,
}: {
  percentage: number;
  size?: number;
}) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);
  const center = size / 2;
  const color =
    percentage >= 100
      ? "#14b8a6"
      : percentage >= 50
        ? "#f59e0b"
        : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

function StepRow({ step }: { step: LaunchpadStep }) {
  const Icon = step.icon;
  const content = (
    <div
      className={cn(
        "flex w-full items-center gap-4 border p-4 text-left transition-colors",
        step.isComplete
          ? "border-green-500/20 bg-green-500/5"
          : step.locked
            ? "border-black/5 bg-background opacity-50 dark:border-white/5"
            : "border-black/5 bg-background hover:border-primary/20 dark:border-white/5",
      )}
    >
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-sm", step.isComplete ? "bg-green-500/10" : "bg-primary/5")}>
        {step.locked ? <Lock className="size-4 text-primary/30" /> : <Icon className={cn("size-5", step.isComplete ? "text-green-500" : "text-primary/50")} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-semibold", step.isComplete ? "text-green-600 dark:text-green-400" : "text-primary")}>{step.title}</p>
          {step.optional ? <span className="text-xs text-primary/40">Not required</span> : null}
        </div>
        <p className="mt-0.5 text-xs text-primary/50">{step.locked && step.lockReason ? step.lockReason : step.description}</p>
      </div>
      {step.isComplete ? <CheckCircle2 className="size-5 shrink-0 text-green-500" /> : step.locked ? <Lock className="size-4 shrink-0 text-primary/20" /> : <ChevronRight className="size-4 shrink-0 text-primary/30" />}
    </div>
  );
  return step.locked ? content : <Link href={step.href}>{content}</Link>;
}

export function LaunchpadSection({
  title,
  description,
  steps,
  completed,
  total,
  percentage,
}: {
  title: string;
  description: string;
  steps: LaunchpadStep[];
  completed: number;
  total: number;
  percentage: number;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
          <p className="mt-0.5 text-xs text-primary/50">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-primary/40">{completed}/{total}</span>
          <CompletionRing percentage={percentage} size={22} />
        </div>
      </div>
      <div className="space-y-2">{steps.map((step) => <StepRow key={step.id} step={step} />)}</div>
    </section>
  );
}
