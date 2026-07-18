"use client";

import { ChevronLeft, ChevronRight, PanelRightOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatRecoveryDate, formatRecoveryMoney } from "./recovery-formatters";
import { RecoveryStatusBadge } from "./recovery-status-badge";
import type { RecoveryCaseRow } from "./recovery-ui-types";

export function RecoveryCasesTable(props: {
  items: RecoveryCaseRow[];
  isLoading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpen: (caseId: string) => void;
}) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 sm:pl-8">Member</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Next action</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="pl-6 sm:pl-8">
                <p className="font-medium">
                  {item.clientName ?? "Unlinked customer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.clientEmail ?? item.id}
                </p>
              </TableCell>
              <TableCell className="capitalize">
                {item.target.toLowerCase()}
              </TableCell>
              <TableCell>
                <RecoveryStatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                {formatRecoveryMoney(
                  item.amountMinor,
                  item.currency,
                  item.currencyExponent,
                )}
              </TableCell>
              <TableCell>{formatRecoveryDate(item.nextActionAt)}</TableCell>
              <TableCell>{item.ownerName ?? "Unassigned"}</TableCell>
              <TableCell className="pr-6 text-right sm:pr-8">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Open case"
                  onClick={() => props.onOpen(item.id)}
                >
                  <PanelRightOpen />
                  <span className="sr-only">Open case</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!props.isLoading && props.items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-28 text-center text-muted-foreground"
              >
                No recovery cases match these filters.
              </TableCell>
            </TableRow>
          )}
          {props.isLoading && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-28 text-center text-muted-foreground"
              >
                Loading recovery cases...
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-2 border-t p-4 sm:px-8">
        <Button
          variant="outline"
          size="sm"
          disabled={!props.hasPrevious}
          onClick={props.onPrevious}
        >
          <ChevronLeft /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!props.hasNext}
          onClick={props.onNext}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </>
  );
}
