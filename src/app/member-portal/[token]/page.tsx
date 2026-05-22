"use client";

import { use } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CreditCard,
  Activity,
  CheckCircle,
  Clock,
  Dumbbell,
  Flame,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

function MembershipStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE")
    return (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
        Active
      </Badge>
    );
  if (status === "FROZEN")
    return (
      <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
        Frozen
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

export default function MemberPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    trpc.memberPortal.getPortalData.queryOptions({ token }),
  );

  const bookMutation = useMutation(
    trpc.memberPortal.bookClass.mutationOptions({
      onSuccess: () => {
        toast.success("Class booked!");
        queryClient.invalidateQueries({
          queryKey: trpc.memberPortal.getPortalData.queryOptions({ token })
            .queryKey,
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <Dumbbell className="h-8 w-8 animate-pulse text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold">Link expired</p>
          <p className="text-sm text-muted-foreground">
            This member portal link has expired or is invalid. Ask your studio
            for a new link.
          </p>
        </Card>
      </div>
    );
  }

  const { client, upcomingClasses } = data;
  const activeMembership = client.studioMembership[0];

  return (
    <div className="min-h-screen bg-background text-black">
      {/* Header */}
      <div className="border-b border-white/5 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Member Portal
            </p>
            <h1 className="text-base font-semibold">{client.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">{client.currentStreak}</span>
            <span className="text-xs text-muted-foreground">streak</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{client.attendanceCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Classes attended
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{client.currentStreak}</p>
            <p className="text-xs text-muted-foreground mt-1">Day streak</p>
          </Card>
          <Card className="p-4 text-center">
            {activeMembership?.classCredit[0] ? (
              <>
                <p className="text-2xl font-bold">
                  {activeMembership.classCredit[0].totalCredits -
                    activeMembership.classCredit[0].usedCredits}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Credits left
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">∞</p>
                <p className="text-xs text-muted-foreground mt-1">Unlimited</p>
              </>
            )}
          </Card>
        </div>

        {/* Active Membership */}
        {activeMembership ? (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Membership</span>
              </div>
              <MembershipStatusBadge status={activeMembership.status} />
            </div>
            <p className="text-base font-bold">
              {activeMembership.membershipPlan?.name ?? activeMembership.name}
            </p>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>
                Started{" "}
                {format(new Date(activeMembership.startDate), "d MMMM yyyy")}
              </p>
              {activeMembership.renewalDate && (
                <p>
                  Renews{" "}
                  {format(
                    new Date(activeMembership.renewalDate),
                    "d MMMM yyyy",
                  )}
                </p>
              )}
              {activeMembership.endDate && (
                <p>
                  Expires{" "}
                  {format(new Date(activeMembership.endDate), "d MMMM yyyy")}
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <p className="text-sm font-medium">No active membership</p>
            <p className="text-xs text-muted-foreground mt-1">
              Client the studio to get set up.
            </p>
          </Card>
        )}

        {/* Tabs: Upcoming / History / Payments */}
        <Tabs defaultValue="upcoming">
          <TabsList className="w-full">
            <TabsTrigger value="upcoming" className="flex-1">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Book a Class
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Classes */}
          <TabsContent value="upcoming" className="mt-4">
            {upcomingClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming classes available.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.map((cls) => {
                  const spotsLeft = cls.maxCapacity
                    ? cls.maxCapacity - cls._count.studioBooking
                    : null;
                  const isFull = spotsLeft !== null && spotsLeft <= 0;

                  return (
                    <Card key={cls.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold">{cls.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(
                              new Date(cls.startTime),
                              "EEE d MMM · HH:mm",
                            )}
                            {cls.endTime &&
                              ` – ${format(new Date(cls.endTime), "HH:mm")}`}
                          </p>
                          {cls.instructor && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              with {cls.instructor.name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {spotsLeft !== null && (
                            <p
                              className={`text-xs ${isFull ? "text-red-500" : "text-muted-foreground"}`}
                            >
                              {isFull ? "Full" : `${spotsLeft} spots`}
                            </p>
                          )}
                          <Button
                            size="sm"
                            disabled={isFull || bookMutation.isPending}
                            onClick={() =>
                              bookMutation.mutate({ token, classId: cls.id })
                            }
                          >
                            Book
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Check-in History */}
          <TabsContent value="history" className="mt-4">
            {client.checkIn.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No classes attended yet.
              </p>
            ) : (
              <div className="space-y-0">
                {client.checkIn.map((ci, index) => (
                  <div key={ci.id}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            {ci.studioClass.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(ci.checkedInAt),
                              "EEE d MMM yyyy · HH:mm",
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ci.checkedInAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {index < client.checkIn.length - 1 && (
                      <Separator className="opacity-20" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payment History */}
          <TabsContent value="payments" className="mt-4">
            {client.studioPayment.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No payments yet.
              </p>
            ) : (
              <div className="space-y-0">
                {client.studioPayment.map((payment, index) => (
                  <div key={payment.id}>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {payment.description ?? payment.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.createdAt), "d MMM yyyy")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        £{Number(payment.amount).toFixed(2)}
                      </p>
                    </div>
                    {index < client.studioPayment.length - 1 && (
                      <Separator className="opacity-20" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
