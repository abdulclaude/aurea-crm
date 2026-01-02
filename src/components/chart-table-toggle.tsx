"use client";

import { BarChart3, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ButtonGroup } from "./ui/button-group";

interface ChartTableToggleProps {
  view: "chart" | "table";
  onViewChange: (view: "chart" | "table") => void;
  className?: string;
}

export function ChartTableToggle({
  view,
  onViewChange,
  className,
}: ChartTableToggleProps) {
  return (
    <div className={cn("inline-flex items-center z-10 ", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewChange("chart")}
        className={cn(
          "h-10 px-3 text-xs transition-all flex items-center gap-1.5 rounded-none ring-0 shadow-none border-l",
          view === "chart"
            ? " text-primary"
            : "text-primary/40 hover:text-primary hover:bg-white/5"
        )}
      >
        <span>Chart</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewChange("table")}
        className={cn(
          "h-10 px-3 text-xs transition-all flex items-center gap-1.5 text-primary rounded-none ring-0 shadow-none border-x",
          view === "table"
            ? "text-primary"
            : "text-primary/40 hover:text-primary"
        )}
      >
        <span>Table</span>
      </Button>
    </div>
  );
}
