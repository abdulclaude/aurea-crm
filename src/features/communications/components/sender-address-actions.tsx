"use client";

import {
  CheckCircle2,
  MailCheck,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { SenderAddressRow } from "./sender-address-dialog";

export function SenderAddressActions({
  address,
  onEdit,
  onTest,
  onSetDefault,
  onToggleDisabled,
  onRemove,
}: {
  address: SenderAddressRow;
  onEdit: () => void;
  onTest: () => void;
  onSetDefault: () => void;
  onToggleDisabled: () => void;
  onRemove: () => void;
}) {
  const ready =
    !address.isDisabled &&
    !address.domainDisabled &&
    address.domainStatus === "VERIFIED" &&
    address.domainLifecycleState === "ACTIVE";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon">
          <span className="sr-only">Open sender address actions</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onTest} disabled={!ready}>
          <MailCheck /> Send test
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Edit sender
        </DropdownMenuItem>
        {!address.isDefault && !address.isDisabled ? (
          <DropdownMenuItem onSelect={onSetDefault}>
            <CheckCircle2 /> Set as default
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onToggleDisabled}>
          <Power />
          {address.isDisabled ? "Enable sender" : "Disable sender"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={onRemove}
        >
          <Trash2 /> Remove sender
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
