"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";
import { 
  User, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  Clock, 
  Activity,
  ArrowLeft,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { VisitorJourneyTimeline } from "./visitor-journey-timeline";
import { VisitorGDPRSettings } from "./visitor-gdpr-settings";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VisitorProfileDetailProps {
  funnelId: string;
  anonymousId: string;
}

const getLifecycleBadgeVariant = (stage: string | null) => {
  switch (stage) {
    case "NEW":
      return "default";
    case "RETURNING":
      return "secondary";
    case "LOYAL":
      return "default";
    case "CHURNED":
      return "destructive";
    default:
      return "outline";
  }
};

export function VisitorProfileDetail({ funnelId, anonymousId }: VisitorProfileDetailProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch visitor profile
  const { data: profileData } = useSuspenseQuery(
    trpc.externalFunnels.getVisitorProfile.queryOptions({
      funnelId,
      anonymousId,
    })
  );

  const profile = profileData?.profile;
  const sessions = profileData?.sessions || [];
  
  // Fetch journey for selected session (only if we have a valid session ID)
  const sessionIdToFetch = selectedSessionId || sessions[0]?.sessionId || "";
  const { data: journeyData } = useSuspenseQuery(
    trpc.externalFunnels.getVisitorJourney.queryOptions({
      funnelId,
      sessionId: sessionIdToFetch,
    })
  );

  if (!profile) {
    return <div>Profile not found</div>;
  }

  const currentSessionId = selectedSessionId || sessions[0]?.sessionId;
  const currentSession = sessions.find(s => s.sessionId === currentSessionId);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Visitors
      </Button>

      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {profile.identifiedUserId ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">{profile.displayName}</CardTitle>
                <CardDescription className="mt-1">
                  {profile.identifiedUserId ? (
                    <>
                      <Badge variant="default" className="mr-2">Identified</Badge>
                      {(profile.userProperties as any)?.email || profile.identifiedUserId}
                    </>
                  ) : (
                    <Badge variant="outline">Anonymous</Badge>
                  )}
                </CardDescription>
              </div>
            </div>

            {profile.lifecycleStage && (
              <Badge variant={getLifecycleBadgeVariant(profile.lifecycleStage)} className="text-sm">
                {profile.lifecycleStage}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="text-muted-foreground">First Seen</p>
                <p className="font-medium">{format(new Date(profile.firstSeen), "MMM d, yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="text-muted-foreground">Last Seen</p>
                <p className="font-medium">{format(new Date(profile.lastSeen), "MMM d, yyyy")}</p>
              </div>
            </div>
            {profile.identifiedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-sm">
                  <p className="text-muted-foreground">Identified On</p>
                  <p className="font-medium">{format(new Date(profile.identifiedAt), "MMM d, yyyy")}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileData?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {profile.totalEvents} total events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileData?.totalConversions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {profileData?.totalSessions ? 
                ((profileData.totalConversions / profileData.totalSessions) * 100).toFixed(1) : "0"}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(profileData?.totalRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profileData?.avgEngagementRate ? profileData.avgEngagementRate.toFixed(1) : "0"}%
            </div>
            <p className="text-xs text-muted-foreground">
              {profileData?.avgExperienceScore ? `${profileData.avgExperienceScore}/100 experience` : "No experience data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Properties */}
      {profile.identifiedUserId && profile.userProperties && Object.keys(profile.userProperties).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Properties</CardTitle>
            <CardDescription>Information collected when user identified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(profile.userProperties as Record<string, any>).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground font-medium">{key}:</span>
                  <span className="text-sm">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GDPR Settings */}
      <VisitorGDPRSettings 
        funnelId={funnelId}
        anonymousId={anonymousId}
        profile={profile}
      />

      {/* Sessions & Journey */}
      <Card>
        <CardHeader>
          <CardTitle>Session History & Journey</CardTitle>
          <CardDescription>
            View individual session journeys and event timelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="journey" className="w-full">
            <TabsList>
              <TabsTrigger value="journey">Journey Timeline</TabsTrigger>
              <TabsTrigger value="sessions">All Sessions</TabsTrigger>
            </TabsList>

            <TabsContent value="journey" className="space-y-4">
              {/* Session Selector */}
              {sessions.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {sessions.map((session, index) => (
                    <Button
                      key={session.sessionId}
                      variant={session.sessionId === currentSessionId ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSessionId(session.sessionId)}
                    >
                      Session {index + 1}
                      {session.converted && <CheckCircle className="h-3 w-3 ml-2 text-green-600" />}
                    </Button>
                  ))}
                </div>
              )}

              {/* Current Session Info */}
              {currentSession && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Started</p>
                      <p className="text-sm font-medium">
                        {format(new Date(currentSession.startedAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium">
                        {currentSession.durationSeconds ? `${Math.floor(currentSession.durationSeconds / 60)}m ${currentSession.durationSeconds % 60}s` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Page Views</p>
                      <p className="text-sm font-medium">{currentSession.pageViews}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-medium">
                        {currentSession.converted ? (
                          <Badge variant="default" className="bg-green-600">Converted</Badge>
                        ) : (
                          <Badge variant="outline">Browsing</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Journey Timeline */}
              {journeyData?.timeline && (
                <div className="mt-6">
                  <VisitorJourneyTimeline events={journeyData.timeline} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="sessions">
              <div className="space-y-4">
                {sessions.map((session, index) => (
                  <div key={session.sessionId} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">Session {index + 1}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.startedAt), "MMM d, yyyy • h:mm a")}
                        </p>
                      </div>
                      {session.converted && (
                        <Badge variant="default" className="bg-green-600">
                          Converted • ${Number(session.conversionValue || 0).toFixed(2)}
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {session.durationSeconds ? `${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Page Views</p>
                        <p className="font-medium">{session.pageViews}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Device</p>
                        <p className="font-medium">{session.deviceType || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {session.city && session.countryCode
                            ? `${session.city}, ${session.countryCode}`
                            : session.countryName || "—"}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSelectedSessionId(session.sessionId);
                        // Switch to journey tab
                        const journeyTab = document.querySelector('[value="journey"]') as HTMLButtonElement;
                        journeyTab?.click();
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Journey
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
