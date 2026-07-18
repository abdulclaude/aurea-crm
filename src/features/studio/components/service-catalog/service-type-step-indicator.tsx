"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { ServiceTypeCreateStep } from "./service-type-create-constants";

const STEPS = [
  { id: 0, label: "Basics" },
  { id: 1, label: "Schedule" },
  { id: 2, label: "Payment" },
  { id: 3, label: "Classification" },
  { id: 4, label: "Publish" },
] as const;

export function ServiceTypeStepIndicator({
  current,
}: {
  current: ServiceTypeCreateStep;
}) {
  return (
    <div className="relative mb-6 grid grid-cols-5 px-6">
      <div className="absolute inset-x-6 top-3 z-0">
        <div className="absolute left-[10%] right-[10%] h-px overflow-hidden bg-border">
          <motion.div
            className="absolute inset-0 origin-left bg-primary"
            animate={{ scaleX: current / (STEPS.length - 1) }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          />
        </div>
      </div>
      {STEPS.map((step) => (
        <div
          key={step.id}
          className="relative z-10 flex min-w-0 flex-col items-center gap-1.5"
        >
          <motion.div
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-background",
              step.id === current
                ? "border border-sky-300/20 border-b-sky-500/70 bg-linear-to-b from-sky-400 to-sky-500 text-primary-foreground shadow-sm"
                : step.id < current
                  ? "bg-muted text-primary"
                  : "bg-muted text-muted-foreground",
            )}
            animate={{ scale: step.id === current ? 1.12 : 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            {step.id + 1}
          </motion.div>

          <motion.span
            className={cn(
              "max-w-full truncate text-[12px] font-medium",
              step.id === current ? "text-primary" : "text-muted-foreground",
            )}
            animate={{ opacity: step.id === current ? 1 : 0.5 }}
            transition={{ duration: 0.25 }}
          >
            {step.label}
          </motion.span>

        </div>
      ))}
    </div>
  );
}
