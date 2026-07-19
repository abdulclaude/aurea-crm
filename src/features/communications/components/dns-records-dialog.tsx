"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { z } from "zod";

import { resendDnsRecordSchema } from "../contracts";
import { DnsRecordRow, isVerifiedDnsStatus } from "./dns-record-row";

type DnsRecord = z.infer<typeof resendDnsRecordSchema>;

export function DnsRecordsDialog({
  domain,
  records,
  open,
  onOpenChange,
}: {
  domain: string;
  records: DnsRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const resetTimer = React.useRef<number | null>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = async (value: string, key: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(message);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error("Could not copy the DNS record");
    }
  };

  const copyAll = () =>
    copy(
      formatDnsRecords(records),
      "all",
      `${records.length} DNS record${records.length === 1 ? "" : "s"} copied`,
    );

  const verifiedCount = records.filter((record) =>
    isVerifiedDnsStatus(record.status),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[60] max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-4xl grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-4xl"
        onOpenAutoFocus={() => {
          if (document.activeElement instanceof HTMLElement) {
            returnFocusRef.current = document.activeElement;
          }
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocusRef.current?.isConnected) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
      >
        <DialogHeader className="gap-1 px-5 pt-5 pr-12 pb-4 sm:px-6 sm:pt-6 sm:pr-14">
          <DialogTitle>Configure DNS records</DialogTitle>
          <DialogDescription>
            Add every record below at your DNS provider for
            <span className="mt-1 block break-all font-mono font-medium text-primary">
              {domain}
            </span>
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="flex min-h-14 items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {records.length} required record
              {records.length === 1 ? "" : "s"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {verifiedCount > 0
                ? `${verifiedCount} of ${records.length} detected`
                : "Waiting for DNS records to be detected"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={records.length === 0}
            onClick={() => void copyAll()}
          >
            {copiedKey === "all" ? <Check /> : <Copy />}
            Copy all
          </Button>
        </div>
        <Separator />
        <div className="min-h-0 overflow-y-auto">
          {records.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium">No DNS records available</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Refresh the domain status to request the records again.
              </p>
            </div>
          ) : null}
          {records.map((record, index) => (
            <DnsRecordRow
              key={`${record.type}-${record.name}-${index}`}
              record={record}
              index={index}
              copiedKey={copiedKey}
              onCopy={(value, key, message) => void copy(value, key, message)}
            />
          ))}
        </div>
        <Separator />
        <DialogFooter className="flex-row items-center justify-between px-5 py-3 sm:px-6">
          <p className="text-left text-[11px] text-muted-foreground">
            TXT records usually go under Host records. Some providers place MX
            records under Mail settings or Custom MX.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getRecordPurpose(type: string): string {
  if (type.toUpperCase() === "MX") return "Mail routing";
  if (type.toUpperCase() === "TXT") return "Domain authentication";
  return "DNS record";
}

function formatDnsRecords(records: DnsRecord[]): string {
  return records
    .map((record) => {
      const rows = [
        `${record.record ?? getRecordPurpose(record.type)} (${record.type})`,
        `Host / name: ${record.name}`,
        `Value: ${record.value}`,
      ];
      if (record.priority !== undefined) {
        rows.push(`Priority: ${record.priority}`);
      }
      if (record.ttl !== undefined) rows.push(`TTL: ${record.ttl}`);
      return rows.join("\n");
    })
    .join("\n\n");
}
