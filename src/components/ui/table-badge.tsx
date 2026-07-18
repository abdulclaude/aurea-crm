import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TABLE_BADGE_COLORS = {
  amber: "#92400e",
  blue: "#1d4ed8",
  cyan: "#155e75",
  emerald: "#047857",
  indigo: "#4338ca",
  orange: "#9a3412",
  rose: "#be123c",
  slate: "#475569",
  teal: "#0f766e",
  violet: "#6d28d9",
} as const;

const DARK_BADGE_COLORS: Record<string, string> = {
  [TABLE_BADGE_COLORS.amber]: "#fbbf24",
  [TABLE_BADGE_COLORS.blue]: "#93c5fd",
  [TABLE_BADGE_COLORS.cyan]: "#67e8f9",
  [TABLE_BADGE_COLORS.emerald]: "#6ee7b7",
  [TABLE_BADGE_COLORS.indigo]: "#a5b4fc",
  [TABLE_BADGE_COLORS.orange]: "#fdba74",
  [TABLE_BADGE_COLORS.rose]: "#fda4af",
  [TABLE_BADGE_COLORS.slate]: "#cbd5e1",
  [TABLE_BADGE_COLORS.teal]: "#5eead4",
  [TABLE_BADGE_COLORS.violet]: "#c4b5fd",
};

type TableBadgeProps = Omit<React.ComponentProps<typeof Badge>, "variant"> & {
  color: string;
};

export function TableBadge({
  className,
  color,
  style,
  ...props
}: TableBadgeProps): React.JSX.Element {
  const badgeStyle: React.CSSProperties & {
    "--table-badge-color": string;
    "--table-badge-dark-color": string;
  } = {
    "--table-badge-color": color,
    "--table-badge-dark-color": DARK_BADGE_COLORS[color] ?? "#cbd5e1",
    backgroundColor: `${color}18`,
    boxShadow: `0 0 0 1px ${color}66`,
    ...style,
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-44 truncate text-[10px] text-[var(--table-badge-color)] ring-0 dark:text-[var(--table-badge-dark-color)]",
        className,
      )}
      style={badgeStyle}
      {...props}
    />
  );
}
