"use client";

import { Check, Loader2, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting } from "../helpers";

interface DashboardHeaderProps {
  userName: string | null | undefined;
  userImage: string | null | undefined;
  isEditing: boolean;
  isSeedPending: boolean;
  isSeedSuccess: boolean;
  onSeed: () => void;
  onToggleEdit: () => void;
  onReset: () => void;
  datePicker?: React.ReactNode;
}

export function DashboardHeader({
  userName,
  userImage,
  isEditing,
  isSeedPending,
  isSeedSuccess,
  onSeed,
  onToggleEdit,
  onReset,
  datePicker,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
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
        <p className="text-[15px] font-semibold text-black/80">
          {getGreeting(userName ?? "there")}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          disabled={isSeedPending}
          onClick={onSeed}
          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-600 shadow-none ring-0 hover:bg-amber-100 disabled:opacity-50"
        >
          {isSeedPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {isSeedPending
            ? "Populating..."
            : isSeedSuccess
              ? "Data added!"
              : "Populate demo data"}
        </Button>

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
