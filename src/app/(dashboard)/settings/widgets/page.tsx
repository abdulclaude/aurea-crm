"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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
import { Copy, Code2, ExternalLink, Trash2 } from "lucide-react";
import { WidgetType } from "@/db/enums";
import { CreateWidgetDialog } from "@/features/studio/widgets/create-widget-dialog";
import { BookingWidgetSettingsDialog } from "@/features/studio/widgets/booking-widget-settings-dialog";
import { InstructorWidgetSettingsDialog } from "@/features/studio/widgets/instructor-widget-settings-dialog";
import { MembershipWidgetSettingsDialog } from "@/features/studio/widgets/membership-widget-settings-dialog";
import { IntroOfferWidgetSettingsDialog } from "@/features/studio/widgets/intro-offer-widget-settings-dialog";
import { EventWidgetSettingsDialog } from "@/features/studio/widgets/event-widget-settings-dialog";
import { OnDemandWidgetSettingsDialog } from "@/features/studio/widgets/on-demand-widget-settings-dialog";
import { ReferralWidgetSettingsDialog } from "@/features/studio/widgets/referral-widget-settings-dialog";
import { WidgetSettingsDialog } from "@/features/studio/widgets/widget-settings-dialog";
import Link from "next/link";

const WIDGET_LABELS: Record<WidgetType, string> = {
  SCHEDULE: "Class Schedule",
  BOOKING: "Booking Widget",
  MEMBERSHIP: "Membership Plans",
  INSTRUCTORS: "Instructor Gallery",
  INTRO_OFFER: "Intro Offers",
  EVENT: "Upcoming Events",
  ON_DEMAND: "On-demand Videos",
  REFERRAL: "Referral Program",
};

export default function WidgetsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.widgets.list.queryOptions());
  const capabilities = useQuery(trpc.permissions.getCurrent.queryOptions());
  const canManage = capabilities.data?.capabilities.includes(
    "publication.manage",
  ) ?? false;
  const updateMutation = useMutation(trpc.widgets.update.mutationOptions());
  const deleteMutation = useMutation(trpc.widgets.delete.mutationOptions());

  const invalidate = () =>
    queryClient.invalidateQueries(trpc.widgets.list.queryOptions());

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy to the clipboard");
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Embeddable Widgets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Publish schedules, appointments, memberships, intro offers, events,
          free videos, referral programs, and instructor galleries to approved websites.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Your widgets</h2>
        {canManage ? <CreateWidgetDialog /> : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.widgets.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No widgets yet. Create one to get your embed code.
        </Card>
      ) : (
        <div className="space-y-3">
          {data.widgets.map((widget) => (
            <Card key={widget.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{widget.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {WIDGET_LABELS[widget.type]}
                    </Badge>
                    <Badge
                      variant={widget.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {widget.isActive ? "Active" : "Disabled"}
                    </Badge>
                    {widget.publicationState === "REPUBLISH_REQUIRED" ? (
                      <Badge variant="destructive" className="text-xs">
                        Republish required
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    id: {widget.id}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canManage ? (
                    <Switch
                      checked={widget.isActive}
                      disabled={updateMutation.isPending}
                      aria-label={`${widget.isActive ? "Disable" : "Enable"} ${widget.name}`}
                      onCheckedChange={async (isActive) => {
                        try {
                          await updateMutation.mutateAsync({ id: widget.id, isActive });
                          await invalidate();
                          toast.success(isActive ? "Widget enabled" : "Widget disabled and publication paused");
                        } catch {
                          toast.error("Could not update widget status");
                        }
                      }}
                    />
                  ) : null}
                  {canManage && widget.type === WidgetType.SCHEDULE ? (
                    <WidgetSettingsDialog widget={widget} />
                  ) : canManage && widget.type === WidgetType.BOOKING ? (
                    <BookingWidgetSettingsDialog widget={widget} />
                  ) : canManage && widget.type === WidgetType.INSTRUCTORS ? (
                    <InstructorWidgetSettingsDialog widget={widget} />
                  ) : canManage && widget.type === WidgetType.MEMBERSHIP ? (
                    <MembershipWidgetSettingsDialog widget={widget} />
                  ) : canManage && widget.type === WidgetType.INTRO_OFFER ? (
                    <IntroOfferWidgetSettingsDialog widget={widget} />
                  ) : canManage && widget.type === WidgetType.EVENT ? (
                    <EventWidgetSettingsDialog widget={widget} />
                  ) : canManage && widget.type === WidgetType.ON_DEMAND ? (
                    <OnDemandWidgetSettingsDialog widget={widget} />
                  ) : canManage && widget.type === WidgetType.REFERRAL ? (
                    <ReferralWidgetSettingsDialog widget={widget} />
                  ) : null}
                  {widget.embed ? (
                    <>
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={widget.embed.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Preview ${widget.name}`}
                          title="Preview widget"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => copy(widget.embed?.previewUrl ?? "")}
                      >
                        <Code2 className="size-3" />
                        Copy URL
                      </Button>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Publish and allow a website
                    </Badge>
                  )}
                  {canManage ? <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${widget.name}`}
                        title="Delete widget"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete widget?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This archives its publication and immediately disables existing embeds.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            try {
                              await deleteMutation.mutateAsync({
                                id: widget.id,
                                archivePublication: true,
                              });
                              await invalidate();
                              toast.success("Widget deleted");
                            } catch {
                              toast.error("Failed to delete widget");
                            }
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog> : null}
                </div>
              </div>

              {widget.embed && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    iFrame embed
                  </p>
                  <div className="relative">
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                      {widget.embed.iframeCode}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 size-6"
                      onClick={() => {
                        const iframeCode = widget.embed?.iframeCode;
                        if (iframeCode) copy(iframeCode);
                      }}
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
