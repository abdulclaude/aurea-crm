"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Globe,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type DomainStatus = "PENDING" | "VERIFYING" | "VERIFIED" | "FAILED";

const statusConfig: Record<
  DomainStatus,
  { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", icon: Clock, variant: "secondary" },
  VERIFYING: { label: "Verifying", icon: Loader2, variant: "outline" },
  VERIFIED: { label: "Verified", icon: CheckCircle2, variant: "default" },
  FAILED: { label: "Failed", icon: AlertCircle, variant: "destructive" },
};

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
}

export function DomainsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dnsDialogDomain, setDnsDialogDomain] = useState<{
    domain: string;
    records: DnsRecord[];
  } | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const { data: domains } = useSuspenseQuery(
    trpc.emailDomains.list.queryOptions()
  );

  const deleteMutation = useMutation(
    trpc.emailDomains.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Domain deleted");
        queryClient.invalidateQueries({ queryKey: trpc.emailDomains.list.queryKey() });
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete domain");
      },
    })
  );

  const verifyMutation = useMutation(
    trpc.emailDomains.verify.mutationOptions({
      onSuccess: () => {
        toast.success("Verification started");
        queryClient.invalidateQueries({ queryKey: trpc.emailDomains.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to verify domain");
      },
    })
  );

  const checkStatusMutation = useMutation(
    trpc.emailDomains.checkStatus.mutationOptions({
      onSuccess: (data) => {
        if (data.status === "VERIFIED") {
          toast.success("Domain verified!");
        } else {
          toast.info(`Status: ${data.status}`);
        }
        queryClient.invalidateQueries({ queryKey: trpc.emailDomains.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to check status");
      },
    })
  );

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  if (!domains || domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Globe className="h-8 w-8 text-primary/50" />
        </div>
        <h3 className="text-lg font-medium mb-2">No email domains</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Add a custom domain to send emails with your own branding.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-white/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="w-[300px]">Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default From</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.map((domain) => {
              const status = statusConfig[domain.status as DomainStatus];
              const StatusIcon = status.icon;

              return (
                <TableRow key={domain.id} className="border-white/5">
                  <TableCell>
                    <div className="font-medium">{domain.domain}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon
                        className={`h-3 w-3 ${domain.status === "VERIFYING" ? "animate-spin" : ""}`}
                      />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {domain.defaultFromName
                      ? `${domain.defaultFromName} <${domain.defaultFromEmail || "hello"}@${domain.domain}>`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(domain.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {domain.dnsRecords && (
                          <DropdownMenuItem
                            onClick={() =>
                              setDnsDialogDomain({
                                domain: domain.domain,
                                records: domain.dnsRecords as unknown as DnsRecord[],
                              })
                            }
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            View DNS Records
                          </DropdownMenuItem>
                        )}

                        {domain.status !== "VERIFIED" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => verifyMutation.mutate({ id: domain.id })}
                              disabled={verifyMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Verify Domain
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => checkStatusMutation.mutate({ id: domain.id })}
                              disabled={checkStatusMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Check Status
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setDeleteId(domain.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* DNS Records Dialog */}
      <Dialog
        open={!!dnsDialogDomain}
        onOpenChange={() => setDnsDialogDomain(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>DNS Records for {dnsDialogDomain?.domain}</DialogTitle>
            <DialogDescription>
              Add these DNS records to your domain provider to verify ownership.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {dnsDialogDomain?.records.map((record, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{record.type}</Badge>
                  {record.priority && (
                    <span className="text-xs text-muted-foreground">
                      Priority: {record.priority}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Name:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted/50 px-2 py-1 rounded max-w-[400px] truncate">
                        {record.name}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(record.name)}
                      >
                        {copiedValue === record.name ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Value:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted/50 px-2 py-1 rounded max-w-[400px] truncate">
                        {record.value}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(record.value)}
                      >
                        {copiedValue === record.value ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this domain? You will need to re-verify
              it to use it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
