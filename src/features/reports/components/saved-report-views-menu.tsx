"use client";

import { ChevronDown, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReportViewDefinition } from "@/features/reports/contracts";

type SavedReportViewsMenuProps = {
  activeName: string | null;
  canManage: boolean;
  onApply: (id: string, definition: ReportViewDefinition) => void;
  onCreateNew: () => void;
  onSave: () => void;
  views: readonly {
    definition: ReportViewDefinition;
    id: string;
    name: string;
    visibility: "PERSONAL" | "LOCATION";
  }[];
};

export function SavedReportViewsMenu(props: SavedReportViewsMenuProps) {
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8.5 text-[11px]">
            {props.activeName ?? "Views"}
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-lg">
          <DropdownMenuLabel className="text-[11px] text-primary/60">
            Saved views
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {props.views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onSelect={() => props.onApply(view.id, view.definition)}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="text-xs">{view.name}</span>
              <span className="text-[10px] text-primary/50">
                {view.visibility === "LOCATION"
                  ? "Shared with location"
                  : "Personal"}
              </span>
            </DropdownMenuItem>
          ))}
          {props.views.length === 0 ? (
            <p className="px-2 py-4 text-center text-[11px] text-primary/50">
              No saved views
            </p>
          ) : null}
          {props.canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={props.onCreateNew}>
                <Save className="size-3.5" /> Save current as new
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!props.canManage}
            onClick={props.onSave}
            aria-label={
              props.activeName ? "Update saved report view" : "Save report view"
            }
          >
            <Save className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {props.activeName ? "Update view" : "Save view"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
