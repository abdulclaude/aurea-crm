"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Threads } from "@/components/ui/threads";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { cn } from "@/lib/utils";

export interface PreloaderStep {
  title: string;
  description: string;
}

export const DEFAULT_PRELOADER_STEPS: PreloaderStep[] = [
  {
    title: "Setting up your studio",
    description:
      "Your workspace is being configured with the details you provided. Manage your team, branding, and settings all in one place.",
  },
  {
    title: "Location pinned",
    description:
      "Your first location is ready. From here you can manage bookings, assign staff, and track everything at a glance.",
  },
  {
    title: "Opening your dashboard",
    description:
      "All systems go. Head into your dashboard to start building pipelines, managing clients, and automating your workflows.",
  },
];

export interface OnboardingPreloaderProps {
  isDark?: boolean;
  /** externally controlled step index; disables internal timers when set */
  activeStep?: number;
  /** ms each step is shown before advancing */
  stepMs?: number;
  steps?: PreloaderStep[];
  /** called after the final fade-out; omit to loop indefinitely */
  onComplete?: () => void;
  /** keep the preloader fully visible until onComplete navigates away */
  holdUntilComplete?: boolean;
  /** thread wave amplitude */
  amplitude?: number;
  /** thread spread distance */
  distance?: number;
  /** threads opacity (0–1) */
  threadsOpacity?: number;
}

export function OnboardingPreloader({
  isDark = false,
  activeStep,
  stepMs = 3000,
  steps = DEFAULT_PRELOADER_STEPS,
  onComplete,
  holdUntilComplete = false,
  amplitude = 4,
  distance = 2,
  threadsOpacity = 0.2,
}: OnboardingPreloaderProps) {
  const [step, setStep] = useState(0);
  const [previewStep, setPreviewStep] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (activeStep === undefined) return;
    setStep(Math.max(0, Math.min(activeStep, steps.length - 1)));
    setPreviewStep(null);
    setFading(false);
  }, [activeStep, steps.length]);

  // Reset whenever steps or stepMs change (useful in preview mode)
  useEffect(() => {
    if (activeStep !== undefined) return;
    setStep(0);
    setPreviewStep(null);
    setFading(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < steps.length; i++) {
      timers.push(
        setTimeout(() => {
          setPreviewStep(null);
          setStep(i);
        }, i * stepMs),
      );
    }

    if (onCompleteRef.current) {
      timers.push(
        setTimeout(() => {
          if (holdUntilComplete) {
            onCompleteRef.current?.();
            return;
          }
          setFading(true);
          setTimeout(() => onCompleteRef.current?.(), 500);
        }, steps.length * stepMs),
      );
    } else {
      // Loop: after all steps complete wait one more beat then restart
      timers.push(
        setTimeout(() => {
          setFading(true);
          setTimeout(() => {
            setFading(false);
            setStep(0);
          }, 500);
        }, steps.length * stepMs),
      );
    }

    return () => timers.forEach(clearTimeout);
    // stepMs and steps.length intentionally omitted — effect resets via key in preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepMs, steps, holdUntilComplete]);

  const threadColor = useMemo<[number, number, number]>(
    () => (isDark ? [1, 1, 1] : [0.12, 0.12, 0.12]),
    [isDark],
  );
  const visibleStep = Math.max(
    0,
    Math.min(previewStep ?? step, steps.length - 1),
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: isDark ? "#0d0d0d" : "#f9f9f9" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      {/* Threads background */}
      <div className="absolute inset-0" style={{ opacity: threadsOpacity }}>
        <Threads
          color={threadColor}
          amplitude={amplitude}
          distance={distance}
        />
      </div>

      {/* Centered text */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-md gap-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={visibleStep}
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <TextShimmer
              as="h2"
              className={cn(
                "text-[2rem] font-semibold tracking-tight leading-tight",
                isDark
                  ? "[--base-color:rgba(255,255,255,0.72)] [--base-gradient-color:#ffffff]"
                  : "[--base-color:#111827] [--base-gradient-color:#0284c7]",
              )}
              duration={1.8}
            >
              {steps[visibleStep]?.title ?? ""}
            </TextShimmer>

            <motion.p
              className={cn(
                "text-sm leading-relaxed max-w-xs -mt-1",
                isDark ? "text-white/45" : "text-gray-500",
              )}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              {steps[visibleStep]?.description ?? ""}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Step pills */}
        <div className="flex items-center gap-2">
          {steps.map((item, i) => {
            const isCompleted = i < step;
            const isCurrent = i === step;
            const isViewed = i === visibleStep;
            const canView = i <= step;
            const stepState = isCompleted
              ? "completed"
              : isCurrent
                ? "current"
                : "upcoming";

            return (
              <Button
                key={item.title}
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canView}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`View ${stepState} step ${i + 1}: ${item.title}`}
                onClick={() => setPreviewStep(isCurrent ? null : i)}
                className={cn(
                  "h-2 rounded-full p-0 transition-all duration-200 disabled:opacity-100 ring hover:ring-0",
                  isViewed ? "w-7" : "w-2.5",
                  isCompleted &&
                    "bg-linear-to-b from-emerald-400 to-emerald-500 border border-emerald-300/20 border-b-emerald-500/70 shadow-sm hover:brightness-110",
                  isCurrent &&
                    (isDark
                      ? "bg-white/85 hover:bg-white"
                      : "bg-linear-to-b from-sky-400 to-sky-500 border border-sky-300/20 border-b-sky-500/70 shadow-sm hover:brightness-110"),
                  !canView && (isDark ? "bg-white/20" : "bg-slate-900/15"),
                  isViewed && isCompleted && "ring-emerald-400/75",
                )}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
