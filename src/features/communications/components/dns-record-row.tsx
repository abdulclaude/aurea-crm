"use client";

import {
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  TriangleAlert,
} from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";

import { resendDnsRecordSchema } from "../contracts";

type DnsRecord = z.infer<typeof resendDnsRecordSchema>;

type DnsRecordRowProps = {
  copiedKey: string | null;
  index: number;
  onCopy: (value: string, key: string, message: string) => void;
  record: DnsRecord;
};

export function DnsRecordRow({
  copiedKey,
  index,
  onCopy,
  record,
}: DnsRecordRowProps) {
  return (
    <div className="border-b px-5 py-4 last:border-b-0 sm:px-6">
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
        <p className="mr-1 min-w-0 truncate text-xs font-medium">
          {record.record ?? getRecordPurpose(record.type)}
        </p>
        <TableBadge color={TABLE_BADGE_COLORS.blue}>{record.type}</TableBadge>
        <DnsStatus status={record.status} />
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_3rem_3rem] gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_4.5rem_4.5rem] sm:gap-3">
        <DnsValue
          label="Host name"
          value={record.name}
          copied={copiedKey === `${index}:name`}
          onCopy={() => onCopy(record.name, `${index}:name`, "DNS host copied")}
        />
        <DnsValue
          label="Value"
          value={record.value}
          copied={copiedKey === `${index}:value`}
          onCopy={() =>
            onCopy(record.value, `${index}:value`, "DNS value copied")
          }
        />
        <DnsReadOnlyValue
          label="Priority"
          value={record.priority === undefined ? "-" : String(record.priority)}
        />
        <DnsReadOnlyValue
          label="TTL"
          value={record.ttl === undefined ? "Auto" : String(record.ttl)}
        />
      </div>
    </div>
  );
}

export function isVerifiedDnsStatus(status?: string): boolean {
  return ["verified", "success", "active"].includes(
    status?.toLowerCase() ?? "",
  );
}

function DnsValue({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </p>
      <div className="relative min-w-0 rounded-md border bg-muted/35">
        <code
          className="block h-9 min-w-0 truncate py-2 pr-9 pl-2.5 text-xs leading-5 select-all sm:pl-3"
          title={value}
        >
          {value}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 size-7 bg-background/80"
          aria-label={`Copy DNS ${label.toLowerCase()}`}
          onClick={onCopy}
        >
          {copied ? <Check className="text-emerald-600" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function DnsReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 truncate text-[11px] font-medium text-muted-foreground">
        {label}
      </p>
      <code
        className="block h-9 min-w-0 truncate rounded-md border bg-muted/35 px-2 py-2 text-xs leading-5 sm:px-3"
        title={value}
      >
        {value}
      </code>
    </div>
  );
}

function DnsStatus({ status }: { status?: string }) {
  const normalized = status?.toLowerCase();
  const verified = isVerifiedDnsStatus(normalized);
  const failed = ["failed", "failure", "temporary_failure"].includes(
    normalized ?? "",
  );
  const Icon = verified ? CheckCircle2 : failed ? TriangleAlert : CircleDashed;
  const label = verified ? "Verified" : failed ? "Failed" : "Verifying";
  const color = verified
    ? TABLE_BADGE_COLORS.emerald
    : failed
      ? TABLE_BADGE_COLORS.rose
      : TABLE_BADGE_COLORS.amber;

  return (
    <TableBadge color={color} className="max-w-none gap-1">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </TableBadge>
  );
}

function getRecordPurpose(type: string): string {
  if (type.toUpperCase() === "MX") return "Mail routing";
  if (type.toUpperCase() === "TXT") return "Domain authentication";
  return "DNS record";
}
