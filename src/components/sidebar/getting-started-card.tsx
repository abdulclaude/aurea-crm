"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sidebarIcons } from "./sidebar-icons";

export type GettingStartedStep = {
  id: string;
  title: string;
  href: string;
  isComplete: boolean;
};

type GettingStartedCardProps = {
  percentage: number;
  steps: GettingStartedStep[];
  celebrationKey: string;
};

const NavigationIcons = sidebarIcons.navigation;
const CONFETTI = [
  { x: -92, y: -70, rotate: -150, color: "bg-emerald-400" },
  { x: -72, y: -105, rotate: 125, color: "bg-amber-400" },
  { x: -48, y: -82, rotate: -95, color: "bg-violet-400" },
  { x: -24, y: -118, rotate: 180, color: "bg-sky-400" },
  { x: 8, y: -96, rotate: -135, color: "bg-emerald-500" },
  { x: 36, y: -116, rotate: 145, color: "bg-amber-300" },
  { x: 62, y: -86, rotate: -175, color: "bg-violet-500" },
  { x: 88, y: -104, rotate: 110, color: "bg-sky-500" },
  { x: -104, y: -34, rotate: 165, color: "bg-sky-400" },
  { x: -58, y: -48, rotate: -120, color: "bg-emerald-400" },
  { x: 55, y: -52, rotate: 135, color: "bg-amber-400" },
  { x: 102, y: -38, rotate: -160, color: "bg-violet-400" },
] as const;

export function GettingStartedCard({
  percentage,
  steps,
  celebrationKey,
}: GettingStartedCardProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const boundedPercentage = Math.max(0, Math.min(100, percentage));
  const isComplete = boundedPercentage === 100;

  useEffect(() => {
    const storageKey = `aurea:getting-started-complete:${celebrationKey}`;
    if (!isComplete) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    if (window.localStorage.getItem(storageKey)) return;

    window.localStorage.setItem(storageKey, "true");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setShowConfetti(true);
    const timeout = window.setTimeout(() => setShowConfetti(false), 1_500);
    return () => window.clearTimeout(timeout);
  }, [celebrationKey, isComplete]);

  return (
    <div className="mb-2 w-full group-data-[collapsible=icon]:mb-1">
      <section className="relative rounded-2xl border border-black/10 bg-background p-3.5 dark:border-white/10 group-data-[collapsible=icon]:hidden">
        {showConfetti ? (
          <div className="pointer-events-none absolute left-1/2 top-10 z-20">
            {CONFETTI.map((particle, index) => (
              <motion.span
                key={`${particle.x}-${particle.y}`}
                className={`absolute block h-2 w-1 rounded-sm ${particle.color}`}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.7 }}
                animate={{
                  x: particle.x,
                  y: particle.y,
                  rotate: particle.rotate,
                  opacity: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 1.2,
                  delay: index * 0.025,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-tight text-primary/85">
            Getting started
          </h2>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={isOpen ? "Collapse getting started" : "Expand getting started"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            className="size-6 rounded-md bg-primary-foreground text-primary/50 hover:text-primary"
          >
            {isOpen ? (
              <NavigationIcons.collapseCard className="size-3" />
            ) : (
              <NavigationIcons.expandCard className="size-3" />
            )}
          </Button>
        </div>

        {isOpen ? (
          <div className="mt-2.5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-foreground">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                  style={{ width: `${boundedPercentage}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium tabular-nums",
                  isComplete ? "text-emerald-500" : "text-primary/50",
                )}
              >
                {boundedPercentage}%
              </span>
            </div>

            <div className="mt-3 space-y-1">
              {steps.map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  prefetch={false}
                  className="group/step flex min-w-0 items-center gap-3 rounded-lg px-0.5 py-2 text-xs text-primary/65 transition-colors hover:text-primary"
                >
                  {step.isComplete ? (
                    <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <NavigationIcons.stepCheck className="size-3" />
                    </span>
                  ) : (
                    <span className="size-3 shrink-0 rounded-full border border-dashed border-primary/30" />
                  )}
                  <span
                    className={cn(
                      "truncate font-medium",
                      step.isComplete && "text-primary",
                    )}
                  >
                    {step.title}
                  </span>
                </Link>
              ))}
            </div>

          </div>
        ) : null}
      </section>

    </div>
  );
}
