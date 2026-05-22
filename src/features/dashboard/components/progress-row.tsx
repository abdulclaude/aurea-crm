"use client";

import type { ReactNode } from "react";

export function ProgressRow({
  label,
  value,
  detail,
  percent,
  leading,
}: {
  label: string;
  value: string;
  detail: string;
  percent: number;
  leading?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-black/70">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-black/35">{detail}</p>
      </div>
      <ProgressRing value={value} percent={percent} />
    </div>
  );
}

function ProgressRing({
  value,
  percent,
}: {
  value: string;
  percent: number;
}) {
  const size = 42;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(percent, 100));
  const offset = circumference * (1 - clampedPercent / 100);
  const center = size / 2;
  const color =
    clampedPercent >= 70
      ? "#14b8a6"
      : clampedPercent >= 40
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="relative flex size-[42px] shrink-0 items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
        />
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
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
        />
      </svg>
      <span className="relative text-[10px] font-semibold tabular-nums text-black/60">
        {value}
      </span>
    </div>
  );
}
