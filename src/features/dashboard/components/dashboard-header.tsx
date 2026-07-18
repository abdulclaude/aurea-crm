"use client";

import { Check, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting } from "../helpers";

interface DashboardHeaderProps {
  userName: string | null | undefined;
  userImage: string | null | undefined;
  isEditing: boolean;
  demoDataControl?: React.ReactNode;
  onToggleEdit: () => void;
  onReset: () => void;
  datePicker?: React.ReactNode;
}

export function DashboardHeader({
  userName,
  userImage,
  isEditing,
  demoDataControl,
  onToggleEdit,
  onReset,
  datePicker,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {userImage ? (
          <img
            src={userImage}
            alt=""
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-black/6 text-[13px] font-semibold text-black/50">
            {userName
              ?.split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() ?? "U"}
          </div>
        )}
        <p className="min-w-0 text-[15px] font-semibold text-black/80">
          {getGreeting(userName ?? "there")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {demoDataControl}

        {datePicker}

        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        )}

        <Button
          variant={isEditing ? "ghost" : "outline"}
          size="sm"
          onClick={onToggleEdit}
          className={
            isEditing
              ? "flex items-center gap-1.5 border-indigo-200 bg-indigo-50 text-[11px] font-medium text-indigo-600 shadow-none ring-0 hover:bg-indigo-100"
              : "flex items-center gap-1.5 text-[11px] font-medium text-black/50"
          }
        >
          {isEditing ? (
            <>
              <Check className="size-3" /> Done
            </>
          ) : (
            <>
              <Settings2 className="size-3" /> Customize widgets
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
