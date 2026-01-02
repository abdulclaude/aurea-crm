"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { User, CheckCircle, XCircle, TrendingUp, Eye } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString, parseAsBoolean } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type VisitorRow = {
  id: string;
  displayName: string;
  firstSeen: Date;
  lastSeen: Date;
  identifiedUserId: string | null;
  identifiedAt: Date | null;
  userProperties: any;
  lifecycleStage: string | null;
  totalSessions: number;
  totalEvents: number;
  avgExperienceScore: number | null;
  avgEngagementRate: number | null;
  lastSession: {
    countryCode: string | null;
    countryName: string | null;
    city: string | null;
    deviceType: string | null;
    browserName: string | null;
  } | null;
};

interface VisitorProfilesProps {
  funnelId: string;
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

const getExperienceScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

export function VisitorProfiles({ funnelId }: VisitorProfilesProps) {
  const trpc = useTRPC();
  const router = useRouter();

  // Query state
  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );
  const [lifecycleStage, setLifecycleStage] = useQueryState(
    "stage",
    parseAsString
  );
  const [hasIdentified, setHasIdentified] = useQueryState(
    "identified",
    parseAsBoolean
  );

  // Pagination state
  const [cursor, setCursor] = React.useState<string | undefined>();

  React.useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, lifecycleStage, hasIdentified]);

  // Fetch visitor profiles
  const { data } = useSuspenseQuery(
    trpc.externalFunnels.getVisitorProfiles.queryOptions({
      funnelId,
      cursor,
      limit: 20,
      filters: {
        searchQuery: searchQuery || undefined,
        lifecycleStage: lifecycleStage || undefined,
        hasIdentified: hasIdentified ?? undefined,
      },
    })
  );

  const visitors = data?.items || [];
  const hasMore = !!data?.nextCursor;

  const columns: ColumnDef<VisitorRow>[] = [
    {
      id: "visitor",
      header: "Visitor",
      enableHiding: false,
      cell: ({ row }) => {
        const seed = row.original.id; // Use visitor ID as seed for consistent colors

        return (
          <div className="flex items-center gap-3">
            <GradientAvatar
              seed={seed}
              name={row.original.displayName}
              size={36}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {row.original.displayName}
              </span>
              {row.original.identifiedUserId && (
                <span className="text-xs text-muted-foreground">
                  {row.original.userProperties?.email ||
                    row.original.identifiedUserId}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          {row.original.identifiedUserId ? (
            <Badge variant="default" className="w-fit">
              Identified
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit">
              Anonymous
            </Badge>
          )}
          {row.original.lifecycleStage && (
            <Badge
              variant={getLifecycleBadgeVariant(row.original.lifecycleStage)}
              className="w-fit text-xs"
            >
              {row.original.lifecycleStage}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "activity",
      header: "Activity",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-sm">
          <span>
            <span className="font-medium">{row.original.totalSessions}</span>{" "}
            sessions
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.totalEvents} events
          </span>
        </div>
      ),
    },
    {
      id: "engagement",
      header: "Engagement",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-sm">
          {row.original.avgEngagementRate !== null ? (
            <span>
              <TrendingUp className="inline h-3 w-3 mr-1" />
              {row.original.avgEngagementRate.toFixed(1)}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: "experience",
      header: "Experience",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-sm">
          {row.original.avgExperienceScore !== null ? (
            <span
              className={getExperienceScoreColor(
                row.original.avgExperienceScore
              )}
            >
              {row.original.avgExperienceScore}/100
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const lastSession = row.original.lastSession;
        if (!lastSession || !lastSession.countryName) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-col text-sm">
            <span>{lastSession.countryName}</span>
            {lastSession.city && (
              <span className="text-xs text-muted-foreground">
                {lastSession.city}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "device",
      header: "Device",
      cell: ({ row }) => {
        const lastSession = row.original.lastSession;
        if (!lastSession?.deviceType) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-col text-sm">
            <span>{lastSession.deviceType}</span>
            {lastSession.browserName && (
              <span className="text-xs text-muted-foreground">
                {lastSession.browserName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "lastSeen",
      header: "Last Seen",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.lastSeen), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            router.push(
              `/funnels/${funnelId}/analytics/visitors/${row.original.id}`
            );
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Visitors
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitors.length}</div>
            <p className="text-xs text-muted-foreground">
              {visitors.filter((v) => v.identifiedUserId).length} identified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sessions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {visitors.length > 0
                ? (
                    visitors.reduce((sum, v) => sum + v.totalSessions, 0) /
                    visitors.length
                  ).toFixed(1)
                : "0"}
            </div>
            <p className="text-xs text-muted-foreground">per visitor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Engagement
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {visitors.length > 0
                ? (
                    visitors
                      .filter((v) => v.avgEngagementRate !== null)
                      .reduce((sum, v) => sum + (v.avgEngagementRate || 0), 0) /
                    visitors.filter((v) => v.avgEngagementRate !== null).length
                  ).toFixed(1)
                : "0"}
              %
            </div>
            <p className="text-xs text-muted-foreground">active time rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Experience
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {visitors.length > 0
                ? Math.round(
                    visitors
                      .filter((v) => v.avgExperienceScore !== null)
                      .reduce(
                        (sum, v) => sum + (v.avgExperienceScore || 0),
                        0
                      ) /
                      visitors.filter((v) => v.avgExperienceScore !== null)
                        .length
                  )
                : "0"}
              /100
            </div>
            <p className="text-xs text-muted-foreground">
              Core Web Vitals score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-full max-w-md">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value || null)}
            className=""
          />
        </div>

        <Select
          value={lifecycleStage || "all"}
          onValueChange={(v) => setLifecycleStage(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="RETURNING">Returning</SelectItem>
            <SelectItem value="LOYAL">Loyal</SelectItem>
            <SelectItem value="CHURNED">Churned</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={
            hasIdentified === null
              ? "all"
              : hasIdentified
              ? "identified"
              : "anonymous"
          }
          onValueChange={(v) =>
            setHasIdentified(v === "all" ? null : v === "identified")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All visitors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visitors</SelectItem>
            <SelectItem value="identified">Identified Only</SelectItem>
            <SelectItem value="anonymous">Anonymous Only</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || lifecycleStage || hasIdentified !== null) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery(null);
              setLifecycleStage(null);
              setHasIdentified(null);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={visitors} />

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setCursor(data?.nextCursor)}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
