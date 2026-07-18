"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RecoverableRun = {
  id: string;
  recoveryConfirmationText: string;
};

export function DemoRecoveryControl({
  run,
  isPending,
  onRecover,
}: {
  run: RecoverableRun;
  isPending: boolean;
  onRecover: (input: { runId: string; confirmation: string }) => void;
}): React.ReactNode {
  const [confirmation, setConfirmation] = useState("");

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-medium">
        An interrupted demo operation can be closed safely.
      </p>
      <Label htmlFor="demo-recovery-confirmation">
        Recovery confirmation
      </Label>
      <Input
        id="demo-recovery-confirmation"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder={run.recoveryConfirmationText}
        autoComplete="off"
        className="shadow-none"
      />
      <Button
        type="button"
        variant="outline"
        disabled={
          isPending || confirmation !== run.recoveryConfirmationText
        }
        onClick={() => onRecover({ runId: run.id, confirmation })}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RotateCcw className="size-4" />
        )}
        {isPending ? "Recovering..." : "Recover interrupted run"}
      </Button>
    </div>
  );
}
