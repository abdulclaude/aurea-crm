"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Send,
  MoreHorizontal,
  Copy,
  Trash2,
  Calendar,
  Pause,
  Play,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Ban,
  MailX,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

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
import { toast } from "sonner";

type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "PAUSED"
  | "FAILED"
  | "CANCELLED";

const statusConfig: Record<
  CampaignStatus,
  { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "Draft", icon: Clock, variant: "secondary" },
  SCHEDULED: { label: "Scheduled", icon: Calendar, variant: "outline" },
  QUEUED: { label: "Queued", icon: Loader2, variant: "outline" },
  SENDING: { label: "Sending", icon: Send, variant: "default" },
  SENT: { label: "Sent", icon: CheckCircle2, variant: "default" },
  PAUSED: { label: "Paused", icon: Pause, variant: "secondary" },
  FAILED: { label: "Failed", icon: AlertCircle, variant: "destructive" },
  CANCELLED: { label: "Cancelled", icon: XCircle, variant: "secondary" },
};

export function CampaignsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data } = useSuspenseQuery(
    trpc.campaigns.list.queryOptions({})
  );

  const deleteMutation = useMutation(
    trpc.campaigns.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign deleted");
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete campaign");
      },
    })
  );

  const duplicateMutation = useMutation(
    trpc.campaigns.duplicate.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign duplicated");
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to duplicate campaign");
      },
    })
  );

  const sendMutation = useMutation(
    trpc.campaigns.send.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign queued for sending");
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send campaign");
      },
    })
  );

  const cancelMutation = useMutation(
    trpc.campaigns.cancel.mutationOptions({
      onSuccess: () => {
        toast.success("Campaign cancelled");
        queryClient.invalidateQueries({ queryKey: trpc.campaigns.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel campaign");
      },
    })
  );

  const campaigns = data?.campaigns ?? [];

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <MailX className="h-8 w-8 text-primary/50" />
        </div>
        <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Create your first email campaign to start engaging with your contacts.
        </p>
        <Button asChild>
          <Link href="/campaigns/new">
            <Send className="h-4 w-4 mr-2" />
            Create Campaign
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="border border-white/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="w-[300px]">Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Open Rate</TableHead>
              <TableHead>Click Rate</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              const status = statusConfig[campaign.status as CampaignStatus];
              const StatusIcon = status.icon;

              const openRate =
                campaign.delivered > 0
                  ? ((campaign.opened / campaign.delivered) * 100).toFixed(1)
                  : "0.0";
              const clickRate =
                campaign.opened > 0
                  ? ((campaign.clicked / campaign.opened) * 100).toFixed(1)
                  : "0.0";

              return (
                <TableRow key={campaign.id} className="border-white/5">
                  <TableCell>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="hover:underline font-medium"
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                      {campaign.subject}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      <StatusIcon className={`h-3 w-3 ${campaign.status === "QUEUED" || campaign.status === "SENDING" ? "animate-spin" : ""}`} />
                      {status.label}
                    </Badge>
                    {campaign.scheduledAt && campaign.status === "SCHEDULED" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(campaign.scheduledAt), "MMM d, h:mm a")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {campaign.totalRecipients > 0
                      ? campaign.totalRecipients.toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {campaign.status === "SENT" ? `${openRate}%` : "-"}
                  </TableCell>
                  <TableCell>
                    {campaign.status === "SENT" ? `${clickRate}%` : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(campaign.createdAt), {
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
                        <DropdownMenuItem asChild>
                          <Link href={`/campaigns/${campaign.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>

                        {campaign.status === "DRAFT" && (
                          <DropdownMenuItem
                            onClick={() => sendMutation.mutate({ id: campaign.id })}
                            disabled={sendMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </DropdownMenuItem>
                        )}

                        {(campaign.status === "SCHEDULED" || campaign.status === "QUEUED") && (
                          <DropdownMenuItem
                            onClick={() => cancelMutation.mutate({ id: campaign.id })}
                            disabled={cancelMutation.isPending}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => duplicateMutation.mutate({ id: campaign.id })}
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setDeleteId(campaign.id)}
                          className="text-destructive focus:text-destructive"
                          disabled={campaign.status === "SENDING" || campaign.status === "QUEUED"}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
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
