"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

type InboxEmailFieldsProps = {
  senderAddressId: string;
  onSenderAddressChange: (senderAddressId: string) => void;
  preferredFromAddress?: string | null;
  subject?: string;
  onSubjectChange?: (subject: string) => void;
};

export function InboxEmailFields({
  senderAddressId,
  onSenderAddressChange,
  preferredFromAddress,
  subject,
  onSubjectChange,
}: InboxEmailFieldsProps): React.JSX.Element {
  const trpc = useTRPC();
  const senderId = useId();
  const subjectId = useId();
  const senderQuery = useQuery(
    trpc.emailSettings.listApprovedSenderChoices.queryOptions(),
  );
  const senders = (senderQuery.data ?? []).filter(
    (sender) =>
      sender.domainStatus === "VERIFIED" &&
      sender.domainLifecycleState === "ACTIVE",
  );
  const preferredSender = preferredFromAddress
    ? senders.find(
        (sender) =>
          sender.email.toLowerCase() === preferredFromAddress.toLowerCase(),
      )
    : undefined;
  const defaultSender =
    preferredSender ?? senders.find((sender) => sender.isDefault) ?? senders[0];

  useEffect(() => {
    if (!senderAddressId && defaultSender) {
      onSenderAddressChange(defaultSender.id);
    }
  }, [defaultSender, onSenderAddressChange, senderAddressId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={senderId} className="text-muted-foreground">
          From
        </Label>
        <Select
          value={senderAddressId || defaultSender?.id}
          onValueChange={onSenderAddressChange}
          disabled={senderQuery.isLoading || senders.length === 0}
        >
          <SelectTrigger id={senderId} className="w-full text-xs">
            <SelectValue
              placeholder={
                senderQuery.isLoading
                  ? "Loading sender addresses..."
                  : "Select a sender address"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {senders.map((sender) => (
              <SelectItem key={sender.id} value={sender.id}>
                {sender.displayName} &lt;{sender.email}&gt;
                {sender.isDefault ? " (default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {senderQuery.isError ? (
          <p className="text-[11px] text-destructive">
            Sender addresses could not be loaded. {senderQuery.error.message}
          </p>
        ) : !senderQuery.isLoading && senders.length === 0 ? (
          <p className="text-[11px] text-destructive">
            No verified sender address is available. Configure one in{" "}
            <Link
              href="/settings/communications/email"
              className="font-medium underline underline-offset-2"
            >
              email settings
            </Link>
            .
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/70">
            Replies use the inbox route configured for this sender account.
          </p>
        )}
      </div>

      {subject !== undefined && onSubjectChange ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={subjectId} className="text-muted-foreground">
            Subject
          </Label>
          <Input
            id={subjectId}
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            maxLength={998}
            placeholder="Enter an email subject"
          />
        </div>
      ) : null}
    </div>
  );
}
