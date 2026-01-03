"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, Copy, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResendTemplate = {
  id: string;
  name: string;
  status?: "draft" | "published";
  alias?: string | null;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
};

const statusConfig: Record<
  NonNullable<ResendTemplate["status"]>,
  { label: string; variant: "default" | "secondary" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
};

export function ResendTemplatesTable() {
  const trpc = useTRPC();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: templates } = useSuspenseQuery(
    trpc.emailTemplates.listResend.queryOptions({ limit: 100 })
  );

  const copyTemplateId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <FileText className="h-8 w-8 text-primary/50" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Resend templates</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Create templates in Resend to make them available here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-white/5">
            <TableHead className="w-[320px]">Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Alias</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => {
            const status =
              template.status && statusConfig[template.status]
                ? statusConfig[template.status]
                : null;

            return (
              <TableRow key={template.id} className="border-white/5">
                <TableCell>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.id}
                  </div>
                </TableCell>
                <TableCell>
                  {status ? (
                    <Badge variant={status.variant}>{status.label}</Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {template.alias || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {template.updated_at
                    ? formatDistanceToNow(new Date(template.updated_at), {
                        addSuffix: true,
                      })
                    : "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyTemplateId(template.id)}
                  >
                    {copiedId === template.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedId === template.id ? "Copied" : "Copy ID"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
