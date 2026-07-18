"use client";

import { Mail, MessageSquareText, RotateCcw, XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import type { RecoveryCaseDetail } from "./recovery-ui-types";

export function RecoveryCaseActions(props: {
  detail: RecoveryCaseDetail;
  canManage: boolean;
  isPending: boolean;
  onRetry: (actionId: string) => void;
  onResend: (channel: "EMAIL" | "SMS") => void;
  onCancel: () => void;
}) {
  const active = ["OPEN", "IN_PROGRESS", "EXHAUSTED"].includes(
    props.detail.recoveryCase.status,
  );
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={!props.canManage || !active || props.isPending}
        onClick={() => props.onResend("EMAIL")}
      >
        <Mail /> Send email
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!props.canManage || !active || props.isPending}
        onClick={() => props.onResend("SMS")}
      >
        <MessageSquareText /> Send SMS
      </Button>
      {props.detail.actions.some(
        (action) =>
          action.status === "FAILED" &&
          action.lastErrorCode !== "ACTION_SIDE_EFFECT_AMBIGUOUS",
      ) && (
        <Button
          variant="outline"
          size="sm"
          disabled={!props.canManage || !active || props.isPending}
          onClick={() => {
            const action = props.detail.actions.find(
              (item) =>
                item.status === "FAILED" &&
                item.lastErrorCode !== "ACTION_SIDE_EFFECT_AMBIGUOUS",
            );
            if (action) props.onRetry(action.id);
          }}
        >
          <RotateCcw /> Retry failed action
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!props.canManage || !active || props.isPending}
          >
            <XCircle /> Cancel recovery
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this recovery case?</AlertDialogTitle>
            <AlertDialogDescription>
              Scheduled reminders and retries will stop. This does not cancel
              the underlying invoice, membership, booking, or provider payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction onClick={props.onCancel}>
              Cancel recovery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
