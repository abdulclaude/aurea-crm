import type { ReactElement } from "react";

type ClassCapacityRingProps = {
  booked: number;
  capacity: number | null;
};

export function ClassCapacityRing({
  booked,
  capacity,
}: ClassCapacityRingProps): ReactElement {
  const size = 42;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const utilization = capacity ? (booked / capacity) * 100 : 0;
  const clampedUtilization = Math.max(0, Math.min(utilization, 100));
  const offset = circumference * (1 - clampedUtilization / 100);
  const center = size / 2;
  const color =
    clampedUtilization >= 70
      ? "#14b8a6"
      : clampedUtilization >= 40
        ? "#f59e0b"
        : "#ef4444";
  const value = `${booked}/${capacity ?? "∞"}`;

  return (
    <div
      className="relative flex size-[42px] shrink-0 items-center justify-center"
      aria-label={`${booked} of ${capacity ?? "unlimited"} places booked`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-black/10 dark:text-white/10"
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
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="relative text-[9px] font-semibold tabular-nums text-primary/70">
        {value}
      </span>
    </div>
  );
}
