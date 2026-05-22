"use client";

interface EdgeAwareXTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
  visibleTicksCount?: number;
}

export function EdgeAwareXTick({
  x = 0,
  y = 0,
  payload,
  index = 0,
  visibleTicksCount = 0,
}: EdgeAwareXTickProps) {
  const isFirst = index === 0;
  const isLast = index === visibleTicksCount - 1;
  const nudge = isFirst ? 8 : isLast ? -8 : 0;
  const anchor = isFirst ? "start" : isLast ? "end" : "middle";
  return (
    <text
      x={x + nudge}
      y={y + 14}
      textAnchor={anchor}
      fontSize={10}
      fill="rgba(0,0,0,0.35)"
    >
      {payload?.value}
    </text>
  );
}
