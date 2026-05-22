"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OnboardingPreloader, DEFAULT_PRELOADER_STEPS } from "@/components/onboarding-preloader";
import type { PreloaderStep } from "@/components/onboarding-preloader";

// ─── Editable step row ────────────────────────────────────────────────────────

function StepEditor({
  index,
  step,
  onChange,
}: {
  index: number;
  step: PreloaderStep;
  onChange: (s: PreloaderStep) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/5 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
        Step {index + 1}
      </span>
      <input
        className="rounded bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/30"
        value={step.title}
        onChange={(e) => onChange({ ...step, title: e.target.value })}
        placeholder="Title"
      />
      <textarea
        className="rounded bg-white/10 px-2 py-1 text-xs text-white/70 placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/30 resize-none"
        rows={2}
        value={step.description}
        onChange={(e) => onChange({ ...step, description: e.target.value })}
        placeholder="Description"
      />
    </div>
  );
}

// ─── Slider row ───────────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-white/80">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        className="w-full accent-white"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ─── Preview page ─────────────────────────────────────────────────────────────

export default function PreloaderPreviewPage() {
  // Controls
  const [isDark, setIsDark] = useState(false);
  const [stepMs, setStepMs] = useState(3000);
  const [amplitude, setAmplitude] = useState(4);
  const [distance, setDistance] = useState(2);
  const [threadsOpacity, setThreadsOpacity] = useState(0.15);
  const [steps, setSteps] = useState<PreloaderStep[]>(
    DEFAULT_PRELOADER_STEPS.map((s) => ({ ...s })),
  );

  // Remount the preloader to restart (key trick)
  const [instanceKey, setInstanceKey] = useState(0);
  const restart = useCallback(() => setInstanceKey((k) => k + 1), []);

  // Sync panel dark/light with the preview background
  const panelBg = isDark ? "bg-black/80" : "bg-white/80";
  const panelText = isDark ? "text-white" : "text-gray-900";
  const panelBorder = isDark ? "border-white/10" : "border-black/10";
  const panelInput = isDark
    ? "bg-white/10 text-white placeholder:text-white/30"
    : "bg-black/5 text-gray-900 placeholder:text-gray-400";

  // Step editor helper
  const updateStep = useCallback(
    (i: number, updated: PreloaderStep) =>
      setSteps((prev) => prev.map((s, idx) => (idx === i ? updated : s))),
    [],
  );

  // Restart whenever any param changes
  useEffect(() => {
    restart();
  }, [stepMs, amplitude, distance, threadsOpacity, isDark, steps, restart]);

  return (
    <div className="relative min-h-screen">
      {/* The preloader fills the background */}
      <OnboardingPreloader
        key={instanceKey}
        isDark={isDark}
        stepMs={stepMs}
        amplitude={amplitude}
        distance={distance}
        threadsOpacity={threadsOpacity}
        steps={steps}
        // no onComplete = loops
      />

      {/* Controls panel — top-right */}
      <div
        className={`fixed top-4 right-4 z-[60] w-72 rounded-xl border backdrop-blur-md shadow-xl flex flex-col gap-4 p-4 ${panelBg} ${panelText} ${panelBorder}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-50">
            Preloader preview
          </span>
          <button
            type="button"
            onClick={restart}
            className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20 transition-colors"
          >
            ↺ Restart
          </button>
        </div>

        {/* Theme toggle */}
        <div className="flex items-center justify-between text-xs">
          <span className="opacity-60">Theme</span>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              type="button"
              onClick={() => setIsDark(false)}
              className={`px-3 py-1 text-xs transition-colors ${!isDark ? "bg-white text-black" : "opacity-40 hover:opacity-60"}`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setIsDark(true)}
              className={`px-3 py-1 text-xs transition-colors ${isDark ? "bg-white/20" : "opacity-40 hover:opacity-60"}`}
            >
              Dark
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-3">
          <SliderRow
            label="Step duration"
            value={stepMs}
            min={500}
            max={4000}
            step={100}
            format={(v) => `${(v / 1000).toFixed(1)}s`}
            onChange={setStepMs}
          />
          <SliderRow
            label="Amplitude"
            value={amplitude}
            min={0}
            max={10}
            step={0.5}
            format={(v) => v.toFixed(1)}
            onChange={setAmplitude}
          />
          <SliderRow
            label="Distance"
            value={distance}
            min={0}
            max={8}
            step={0.5}
            format={(v) => v.toFixed(1)}
            onChange={setDistance}
          />
          <SliderRow
            label="Threads opacity"
            value={threadsOpacity}
            min={0.1}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={setThreadsOpacity}
          />
        </div>

        {/* Step text editors */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-40">
            Step text
          </span>
          {steps.map((s, i) => (
            <StepEditor
              key={i}
              index={i}
              step={s}
              onChange={(updated) => updateStep(i, updated)}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              setSteps((prev) => [
                ...prev,
                { title: "New step", description: "Description goes here." },
              ])
            }
            className="rounded-md bg-white/10 px-2 py-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            + Add step
          </button>
          {steps.length > 1 && (
            <button
              type="button"
              onClick={() => setSteps((prev) => prev.slice(0, -1))}
              className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30 transition-colors"
            >
              − Remove last step
            </button>
          )}
        </div>

        <p className="text-[10px] opacity-30 text-center">
          /onboarding/preview — dev only
        </p>
      </div>
    </div>
  );
}
