"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type PricingOptionCreateStep = 0 | 1 | 2;

const STEPS = [
  { id: 0, label: "Pricing" },
  { id: 1, label: "Access" },
  { id: 2, label: "Publish" },
] as const;

export function PricingOptionStepIndicator({
  current,
}: {
  current: PricingOptionCreateStep;
}) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((step) => (
        <div key={step.id} className="flex items-center gap-2">
          <motion.div
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
              step.id === current
                ? "border border-sky-300/20 border-b-sky-500/70 bg-linear-to-b from-sky-400 to-sky-500 text-primary-foreground shadow-sm"
                : step.id < current
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
            )}
            animate={{ scale: step.id === current ? 1.12 : 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            {step.id + 1}
          </motion.div>

          <motion.span
            className={cn(
              "text-[12px] font-medium",
              step.id === current ? "text-primary" : "text-muted-foreground",
            )}
            animate={{ opacity: step.id === current ? 1 : 0.5 }}
            transition={{ duration: 0.25 }}
          >
            {step.label}
          </motion.span>

          {step.id < 2 && (
            <div className="relative mx-1 h-px w-8 overflow-hidden bg-border">
              <motion.div
                className="absolute inset-0 origin-left bg-primary"
                animate={{ scaleX: current > step.id ? 1 : 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
