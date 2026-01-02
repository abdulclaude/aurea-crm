import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import db from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { generateApiKey } from "@/lib/encryption";

export const externalFunnelsRouter = createTRPCRouter({
  /**
   * Register a new external funnel
   */
  register: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        externalUrl: z.string().url(),
        additionalDomains: z.array(z.string().url()).optional(),
        trackingConfig: z
          .object({
            autoTrackPageViews: z.boolean().default(true),
            autoTrackForms: z.boolean().default(true),
            autoTrackClicks: z.boolean().default(false),
            autoTrackScrollDepth: z.boolean().default(false),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Generate unique API key for this funnel
      const apiKey = generateApiKey();

      const funnel = await db.funnel.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,

          // External funnel specific
          funnelType: "EXTERNAL",
          isReadOnly: true,
          externalUrl: input.externalUrl,
          externalDomains: input.additionalDomains || [],
          apiKey,
          trackingConfig: input.trackingConfig || {},

          status: "PUBLISHED", // External funnels are always "published"
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        funnel,
        apiKey, // Return API key ONCE for user to store
      };
    }),

  /**
   * Update external funnel metadata
   */
  updateExternal: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        externalUrl: z.string().url().optional(),
        additionalDomains: z.array(z.string().url()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          funnelType: "EXTERNAL",
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "External funnel not found",
        });
      }

      const updated = await db.funnel.update({
        where: { id: input.funnelId },
        data: {
          name: input.name,
          description: input.description,
          externalUrl: input.externalUrl,
          externalDomains: input.additionalDomains,
          updatedAt: new Date(),
        },
      });

      return updated;
    }),

  /**
   * Regenerate API key (in case of compromise)
   */
  regenerateApiKey: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          funnelType: "EXTERNAL",
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "External funnel not found",
        });
      }

      const newApiKey = generateApiKey();

      await db.funnel.update({
        where: { id: input.funnelId },
        data: { apiKey: newApiKey },
      });

      return { apiKey: newApiKey };
    }),

  /**
   * Get analytics data for a funnel
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["7d", "30d", "90d"]).default("7d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = parseInt(input.timeRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);

      const whereClause: any = {
        funnelId: input.funnelId,
        timestamp: { gte: dateFrom },
      };

      // Get stats
      const [totalEvents, totalSessions, pageViews, conversions, revenue] =
        await Promise.all([
          db.funnelEvent.count({ where: whereClause }),
          db.funnelSession.count({
            where: {
              funnelId: input.funnelId,
              startedAt: { gte: dateFrom },
            },
          }),
          db.funnelEvent.count({
            where: { ...whereClause, eventName: "page_view" },
          }),
          db.funnelEvent.count({
            where: { ...whereClause, isConversion: true },
          }),
          db.funnelEvent.aggregate({
            where: { ...whereClause, isConversion: true },
            _sum: { revenue: true },
          }),
        ]);

      // Get traffic sources
      const trafficSourcesRaw = await db.funnelEvent.findMany({
        where: whereClause,
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
        distinct: ["utmSource", "utmMedium", "utmCampaign"],
        take: 10,
      });

      // Count occurrences manually
      const sourceMap = new Map<string, number>();
      const allEvents = await db.funnelEvent.findMany({
        where: whereClause,
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      });

      allEvents.forEach((event) => {
        const key = `${event.utmSource || "Direct"}_${event.utmMedium || ""}_${event.utmCampaign || ""}`;
        sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
      });

      const trafficSources = Array.from(sourceMap.entries())
        .map(([key, count]) => {
          const [utmSource, utmMedium, utmCampaign] = key.split("_");
          return {
            utmSource: utmSource === "Direct" ? null : utmSource,
            utmMedium: utmMedium || null,
            utmCampaign: utmCampaign || null,
            count,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate avg session duration
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: { gte: dateFrom },
          endedAt: { not: null },
        },
        select: {
          startedAt: true,
          endedAt: true,
        },
      });

      let avgSessionDuration = 0;
      if (sessions.length > 0) {
        const totalDuration = sessions.reduce((sum, session) => {
          if (session.endedAt) {
            return (
              sum + (session.endedAt.getTime() - session.startedAt.getTime())
            );
          }
          return sum;
        }, 0);
        avgSessionDuration = totalDuration / sessions.length;
      }

      return {
        stats: {
          totalEvents,
          totalSessions,
          totalPageViews: pageViews,
          totalConversions: conversions,
          totalRevenue: revenue._sum.revenue || 0,
          avgSessionDuration,
        },
        trafficSources,
      };
    }),

  /**
   * Get events for a funnel
   */
  getEvents: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        limit: z.number().min(1).max(500).default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      const events = await db.funnelEvent.findMany({
        where: { funnelId: input.funnelId },
        orderBy: { timestamp: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (events.length > input.limit) {
        const nextItem = events.pop();
        nextCursor = nextItem?.id;
      }

      return {
        events,
        nextCursor,
      };
    }),

  /**
   * Get sessions for a funnel
   */
  getSessions: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      const sessions = await db.funnelSession.findMany({
        where: { funnelId: input.funnelId },
        orderBy: { startedAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          profile: {
            select: {
              displayName: true,
              identifiedUserId: true,
              userProperties: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (sessions.length > input.limit) {
        const nextItem = sessions.pop();
        nextCursor = nextItem?.id;
      }

      // Map sessions to include visitor display names
      const sessionsWithNames = sessions.map((session) => ({
        ...session,
        visitorDisplayName: session.profile?.displayName || 
                           session.userId || 
                           session.anonymousId || 
                           "Anonymous Visitor",
      }));

      return {
        sessions: sessionsWithNames,
        nextCursor,
      };
    }),

  /**
   * Get user profiles for a funnel (batch)
   */
  getUserProfiles: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        anonymousIds: z.array(z.string()).max(100), // Limit to 100 IDs per request
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      const profiles = await db.anonymousUserProfile.findMany({
        where: {
          id: { in: input.anonymousIds },
        },
        select: {
          id: true,
          displayName: true,
          firstSeen: true,
          lastSeen: true,
          totalSessions: true,
          totalEvents: true,
        },
      });

      // Return as object for tRPC serialization (Map doesn't serialize well)
      const profileMap: Record<string, {
        id: string;
        displayName: string;
        firstSeen: Date;
        lastSeen: Date;
        totalSessions: number;
        totalEvents: number;
      }> = {};
      
      for (const p of profiles) {
        profileMap[p.id] = p;
      }

      return profileMap;
    }),

  /**
   * Get traffic sources for a funnel
   */
  getTrafficSources: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["7d", "30d", "90d"]).default("30d"),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = parseInt(input.timeRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);

      // Aggregate traffic sources from sessions (more accurate than events)
      const sessions = await db.funnelSession.groupBy({
        by: ["firstSource", "firstMedium", "firstCampaign"],
        where: {
          funnelId: input.funnelId,
          startedAt: { gte: dateFrom },
        },
        _count: {
          id: true,
        },
        _sum: {
          conversionValue: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: input.limit,
      });

      const trafficSources = sessions.map((source) => ({
        source: source.firstSource || "Direct",
        medium: source.firstMedium || "None",
        campaign: source.firstCampaign || "None",
        sessions: source._count.id,
        revenue: Number(source._sum.conversionValue || 0),
      }));

      return {
        trafficSources,
        nextCursor: undefined, // Can add pagination later if needed
      };
    }),

  /**
   * Get funnel flow visualization data (for Sankey diagrams)
   */
  getFunnelFlow: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["7d", "30d", "90d"]).default("30d"),
        eventType: z.enum(["page_view", "all"]).default("page_view"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = parseInt(input.timeRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);

      // Get all sessions with their events in sequence
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: { gte: dateFrom },
        },
        select: {
          id: true,
          sessionId: true,
          converted: true,
        },
      });

      // Get events for these sessions, ordered by timestamp
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          timestamp: { gte: dateFrom },
          ...(input.eventType === "page_view" && { eventName: "page_view" }),
        },
        select: {
          sessionId: true,
          eventName: true,
          pagePath: true,
          pageTitle: true,
          timestamp: true,
          isConversion: true,
        },
        orderBy: {
          timestamp: "asc",
        },
      });

      // Group events by session
      const sessionMap = new Map<string, typeof events>();
      for (const event of events) {
        if (!sessionMap.has(event.sessionId)) {
          sessionMap.set(event.sessionId, []);
        }
        sessionMap.get(event.sessionId)!.push(event);
      }

      // Build flow data: nodes and links
      const nodes = new Map<string, { id: string; label: string; count: number }>();
      const links = new Map<string, { source: string; target: string; value: number }>();

      // Track unique sessions per node for accurate counts
      const nodeSessionCounts = new Map<string, Set<string>>();

      for (const [sessionId, sessionEvents] of sessionMap.entries()) {
        if (sessionEvents.length === 0) continue;

        for (let i = 0; i < sessionEvents.length; i++) {
          const event = sessionEvents[i];
          const nodeId = event.pagePath || event.eventName || "Unknown";
          const nodeLabel = event.pageTitle || event.pagePath || event.eventName || "Unknown";

          // Track unique sessions for this node
          if (!nodeSessionCounts.has(nodeId)) {
            nodeSessionCounts.set(nodeId, new Set());
          }
          nodeSessionCounts.get(nodeId)!.add(sessionId);

          // Create or update node
          if (!nodes.has(nodeId)) {
            nodes.set(nodeId, {
              id: nodeId,
              label: nodeLabel,
              count: 0, // Will update after
            });
          }

          // Create link to next step
          if (i < sessionEvents.length - 1) {
            const nextEvent = sessionEvents[i + 1];
            const nextNodeId = nextEvent.pagePath || nextEvent.eventName || "Unknown";
            const linkId = `${nodeId}→${nextNodeId}`;

            if (!links.has(linkId)) {
              links.set(linkId, {
                source: nodeId,
                target: nextNodeId,
                value: 0,
              });
            }
            links.get(linkId)!.value += 1;
          }
        }
      }

      // Update node counts with unique session counts
      for (const [nodeId, sessionSet] of nodeSessionCounts.entries()) {
        const node = nodes.get(nodeId);
        if (node) {
          node.count = sessionSet.size;
        }
      }

      // Convert to arrays and sort by count
      const nodesArray = Array.from(nodes.values()).sort((a, b) => b.count - a.count);
      const linksArray = Array.from(links.values()).sort((a, b) => b.value - a.value);

      // Calculate conversion metrics
      const totalSessions = sessions.length;
      const convertedSessions = sessions.filter((s) => s.converted).length;
      const conversionRate = totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0;

      return {
        nodes: nodesArray,
        links: linksArray,
        metrics: {
          totalSessions,
          convertedSessions,
          conversionRate: Number(conversionRate.toFixed(2)),
          dropOffRate: Number((100 - conversionRate).toFixed(2)),
        },
      };
    }),

  /**
   * Get UTM campaign analytics with deep insights
   */
  getUTMAnalytics: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["7d", "30d", "90d"]).default("30d"),
        groupBy: z.enum(["source", "medium", "campaign", "all"]).default("campaign"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = parseInt(input.timeRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);

      // Get UTM data aggregated by sessions
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: { gte: dateFrom },
        },
        select: {
          id: true,
          firstSource: true,
          firstMedium: true,
          firstCampaign: true,
          converted: true,
          conversionValue: true,
          pageViews: true,
          eventsCount: true,
          durationSeconds: true,
        },
      });

      // Group by specified dimension
      const groupMap = new Map<string, {
        source: string;
        medium: string;
        campaign: string;
        sessions: number;
        conversions: number;
        conversionRate: number;
        revenue: number;
        avgPageViews: number;
        avgDuration: number;
        totalPageViews: number;
        totalEvents: number;
      }>();

      for (const session of sessions) {
        const source = session.firstSource || "Direct";
        const medium = session.firstMedium || "None";
        const campaign = session.firstCampaign || "None";

        // Create group key based on groupBy parameter
        let groupKey: string;
        if (input.groupBy === "source") {
          groupKey = source;
        } else if (input.groupBy === "medium") {
          groupKey = medium;
        } else if (input.groupBy === "campaign") {
          groupKey = campaign;
        } else {
          // "all" - group by all three
          groupKey = `${source}|${medium}|${campaign}`;
        }

        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            source,
            medium,
            campaign,
            sessions: 0,
            conversions: 0,
            conversionRate: 0,
            revenue: 0,
            avgPageViews: 0,
            avgDuration: 0,
            totalPageViews: 0,
            totalEvents: 0,
          });
        }

        const group = groupMap.get(groupKey)!;
        group.sessions += 1;
        if (session.converted) group.conversions += 1;
        group.revenue += Number(session.conversionValue || 0);
        group.totalPageViews += session.pageViews;
        group.totalEvents += session.eventsCount;
      }

      // Calculate averages and conversion rates
      const analytics = Array.from(groupMap.values()).map((group) => ({
        ...group,
        conversionRate: group.sessions > 0
          ? Number(((group.conversions / group.sessions) * 100).toFixed(2))
          : 0,
        avgPageViews: group.sessions > 0
          ? Number((group.totalPageViews / group.sessions).toFixed(2))
          : 0,
        avgRevenue: group.sessions > 0
          ? Number((group.revenue / group.sessions).toFixed(2))
          : 0,
        costPerConversion: group.conversions > 0
          ? Number((group.revenue / group.conversions).toFixed(2))
          : 0,
      }));

      // Sort by sessions (most popular first)
      analytics.sort((a, b) => b.sessions - a.sessions);

      // Calculate totals
      const totals = {
        totalSessions: sessions.length,
        totalConversions: sessions.filter((s) => s.converted).length,
        totalRevenue: sessions.reduce((sum, s) => sum + Number(s.conversionValue || 0), 0),
        avgConversionRate: sessions.length > 0
          ? Number(((sessions.filter((s) => s.converted).length / sessions.length) * 100).toFixed(2))
          : 0,
      };

      return {
        analytics,
        totals,
        groupBy: input.groupBy,
      };
    }),

  /**
   * Get events time-series data for charts
   */
  getEventsTrend: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        interval: z.enum(["hour", "day"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate time range
      const now = new Date();
      const startDate = new Date();
      switch (input.timeRange) {
        case "24h":
          startDate.setHours(now.getHours() - 24);
          break;
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
      }

      // Auto-determine interval if not specified
      const interval = input.interval || (input.timeRange === "24h" ? "hour" : "day");

      // Fetch events in time range
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          timestamp: {
            gte: startDate,
            lte: now,
          },
        },
        orderBy: { timestamp: "asc" },
        select: {
          id: true,
          eventName: true,
          timestamp: true,
          isConversion: true,
          revenue: true,
          eventCategory: true,
        },
      });

      // Group events by time interval
      const timeSeriesMap = new Map<string, {
        timestamp: string;
        date: Date;
        pageViews: number;
        customEvents: number;
        conversions: number;
        totalEvents: number;
        revenue: number;
      }>();

      for (const event of events) {
        let key: string;
        if (interval === "hour") {
          // Group by hour
          key = event.timestamp.toISOString().slice(0, 13) + ":00:00.000Z";
        } else {
          // Group by day
          key = event.timestamp.toISOString().slice(0, 10) + "T00:00:00.000Z";
        }

        if (!timeSeriesMap.has(key)) {
          timeSeriesMap.set(key, {
            timestamp: key,
            date: new Date(key),
            pageViews: 0,
            customEvents: 0,
            conversions: 0,
            totalEvents: 0,
            revenue: 0,
          });
        }

        const bucket = timeSeriesMap.get(key)!;
        bucket.totalEvents += 1;
        
        if (event.eventName === "page_view") {
          bucket.pageViews += 1;
        } else {
          bucket.customEvents += 1;
        }

        if (event.isConversion) {
          bucket.conversions += 1;
        }

        bucket.revenue += Number(event.revenue || 0);
      }

      // Convert to array and sort by timestamp
      const timeSeries = Array.from(timeSeriesMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      // Get event type breakdown with categories
      const eventTypeMap = new Map<string, { count: number; category: string | null }>();
      for (const event of events) {
        const existing = eventTypeMap.get(event.eventName);
        if (existing) {
          existing.count += 1;
        } else {
          eventTypeMap.set(event.eventName, { 
            count: 1, 
            category: event.eventCategory || null 
          });
        }
      }

      const eventTypes = Array.from(eventTypeMap.entries())
        .map(([name, data]) => ({ 
          eventName: name, 
          count: data.count,
          category: data.category 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Top 20 event types

      return {
        timeSeries,
        eventTypes,
        interval,
        totalEvents: events.length,
        totalConversions: events.filter(e => e.isConversion).length,
        totalRevenue: events.reduce((sum, e) => sum + Number(e.revenue || 0), 0),
      };
    }),

  /**
   * Get sessions time-series data for charts
   */
  getSessionsTrend: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        interval: z.enum(["hour", "day"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate time range
      const now = new Date();
      const startDate = new Date();
      switch (input.timeRange) {
        case "24h":
          startDate.setHours(now.getHours() - 24);
          break;
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
      }

      // Auto-determine interval if not specified
      const interval = input.interval || (input.timeRange === "24h" ? "hour" : "day");

      // Fetch sessions in time range
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: {
            gte: startDate,
            lte: now,
          },
        },
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          pageViews: true,
          eventsCount: true,
          converted: true,
          conversionValue: true,
          durationSeconds: true,
          experienceScore: true,
        },
      });

      // Group sessions by time interval
      const timeSeriesMap = new Map<string, {
        timestamp: string;
        date: Date;
        sessions: number;
        pageViews: number;
        conversions: number;
        revenue: number;
        avgDuration: number;
        totalDuration: number;
        avgExperienceScore: number;
        totalExperienceScore: number;
        experienceScoreCount: number;
      }>();

      for (const session of sessions) {
        let key: string;
        if (interval === "hour") {
          key = session.startedAt.toISOString().slice(0, 13) + ":00:00.000Z";
        } else {
          key = session.startedAt.toISOString().slice(0, 10) + "T00:00:00.000Z";
        }

        if (!timeSeriesMap.has(key)) {
          timeSeriesMap.set(key, {
            timestamp: key,
            date: new Date(key),
            sessions: 0,
            pageViews: 0,
            conversions: 0,
            revenue: 0,
            avgDuration: 0,
            totalDuration: 0,
            avgExperienceScore: 0,
            totalExperienceScore: 0,
            experienceScoreCount: 0,
          });
        }

        const bucket = timeSeriesMap.get(key)!;
        bucket.sessions += 1;
        bucket.pageViews += session.pageViews;
        
        if (session.converted) {
          bucket.conversions += 1;
        }

        bucket.revenue += Number(session.conversionValue || 0);
        bucket.totalDuration += session.durationSeconds || 0;
        if (session.experienceScore !== null && session.experienceScore !== undefined) {
          bucket.totalExperienceScore += Number(session.experienceScore);
          bucket.experienceScoreCount += 1;
        }
      }

      // Calculate averages
      const timeSeries = Array.from(timeSeriesMap.values())
        .map(item => ({
          ...item,
          avgDuration: item.sessions > 0 ? Math.round(item.totalDuration / item.sessions) : 0,
          avgExperienceScore: item.experienceScoreCount > 0
            ? Math.round(item.totalExperienceScore / item.experienceScoreCount)
            : 0,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      // Get duration distribution buckets (in seconds)
      const durationBuckets = [
        { range: "0-30s", min: 0, max: 30, count: 0 },
        { range: "30s-1m", min: 30, max: 60, count: 0 },
        { range: "1-2m", min: 60, max: 120, count: 0 },
        { range: "2-5m", min: 120, max: 300, count: 0 },
        { range: "5-10m", min: 300, max: 600, count: 0 },
        { range: "10m+", min: 600, max: Infinity, count: 0 },
      ];

      for (const session of sessions) {
        const duration = session.durationSeconds || 0;
        const bucket = durationBuckets.find(b => duration >= b.min && duration < b.max);
        if (bucket) {
          bucket.count += 1;
        }
      }

      return {
        timeSeries,
        durationDistribution: durationBuckets,
        interval,
        totalSessions: sessions.length,
        totalConversions: sessions.filter(s => s.converted).length,
        totalRevenue: sessions.reduce((sum, s) => sum + Number(s.conversionValue || 0), 0),
        avgPageViews: sessions.length > 0 
          ? Math.round(sessions.reduce((sum, s) => sum + s.pageViews, 0) / sessions.length)
          : 0,
        avgDuration: sessions.length > 0 
          ? Math.round(sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / sessions.length)
          : 0,
        avgExperienceScore: (() => {
          const scoredSessions = sessions.filter(
            (s) => s.experienceScore !== null && s.experienceScore !== undefined
          );
          if (scoredSessions.length === 0) return 0;
          const totalScore = scoredSessions.reduce(
            (sum, s) => sum + Number(s.experienceScore || 0),
            0
          );
          return Math.round(totalScore / scoredSessions.length);
        })(),
      };
    }),

  /**
   * Get device analytics data for charts
   */
  getDeviceAnalytics: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["7d", "30d", "90d"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate time range
      const now = new Date();
      const startDate = new Date();
      switch (input.timeRange) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
      }

      // Fetch sessions with device info
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          id: true,
          deviceType: true,
          browserName: true,
          browserVersion: true,
          osName: true,
          osVersion: true,
          converted: true,
          conversionValue: true,
          pageViews: true,
        },
      });

      // Group by device type
      const deviceTypeMap = new Map<string, {
        deviceType: string;
        sessions: number;
        conversions: number;
        revenue: number;
        pageViews: number;
      }>();

      // Group by browser
      const browserMap = new Map<string, {
        browser: string;
        sessions: number;
        conversions: number;
        revenue: number;
        pageViews: number;
      }>();

      // Group by OS
      const osMap = new Map<string, {
        os: string;
        sessions: number;
        conversions: number;
        revenue: number;
        pageViews: number;
      }>();

      for (const session of sessions) {
        // Device type aggregation
        const deviceType = session.deviceType || "Unknown";
        if (!deviceTypeMap.has(deviceType)) {
          deviceTypeMap.set(deviceType, {
            deviceType,
            sessions: 0,
            conversions: 0,
            revenue: 0,
            pageViews: 0,
          });
        }
        const deviceBucket = deviceTypeMap.get(deviceType)!;
        deviceBucket.sessions += 1;
        deviceBucket.pageViews += session.pageViews;
        if (session.converted) {
          deviceBucket.conversions += 1;
        }
        deviceBucket.revenue += Number(session.conversionValue || 0);

        // Browser aggregation
        const browser = session.browserName || "Unknown";
        if (!browserMap.has(browser)) {
          browserMap.set(browser, {
            browser,
            sessions: 0,
            conversions: 0,
            revenue: 0,
            pageViews: 0,
          });
        }
        const browserBucket = browserMap.get(browser)!;
        browserBucket.sessions += 1;
        browserBucket.pageViews += session.pageViews;
        if (session.converted) {
          browserBucket.conversions += 1;
        }
        browserBucket.revenue += Number(session.conversionValue || 0);

        // OS aggregation
        const os = session.osName || "Unknown";
        if (!osMap.has(os)) {
          osMap.set(os, {
            os,
            sessions: 0,
            conversions: 0,
            revenue: 0,
            pageViews: 0,
          });
        }
        const osBucket = osMap.get(os)!;
        osBucket.sessions += 1;
        osBucket.pageViews += session.pageViews;
        if (session.converted) {
          osBucket.conversions += 1;
        }
        osBucket.revenue += Number(session.conversionValue || 0);
      }

      // Convert to arrays and add percentages
      const totalSessions = sessions.length;

      const deviceTypes = Array.from(deviceTypeMap.values())
        .map(item => ({
          ...item,
          percentage: totalSessions > 0 ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0,
          conversionRate: item.sessions > 0 ? Number(((item.conversions / item.sessions) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions);

      const browsers = Array.from(browserMap.values())
        .map(item => ({
          ...item,
          percentage: totalSessions > 0 ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0,
          conversionRate: item.sessions > 0 ? Number(((item.conversions / item.sessions) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions);

      const operatingSystems = Array.from(osMap.values())
        .map(item => ({
          ...item,
          percentage: totalSessions > 0 ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0,
          conversionRate: item.sessions > 0 ? Number(((item.conversions / item.sessions) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions);

      return {
        deviceTypes,
        browsers,
        operatingSystems,
        totalSessions,
        totalConversions: sessions.filter(s => s.converted).length,
      };
    }),

  /**
   * Get geography analytics data for charts
   */
  getGeographyAnalytics: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["7d", "30d", "90d"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate time range
      const now = new Date();
      const startDate = new Date();
      switch (input.timeRange) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
      }

      // Fetch sessions with geo info
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          id: true,
          sessionId: true,
          countryCode: true,
          countryName: true,
          region: true,
          city: true,
          converted: true,
          conversionValue: true,
          pageViews: true,
        },
      });

      const hasKnownGeo = (value?: string | null) =>
        !!value && value !== "Unknown";

      const sessionsMissingGeo = sessions.filter(
        (session) =>
          !hasKnownGeo(session.countryCode) && !hasKnownGeo(session.countryName)
      );

      let sessionGeoFallback = new Map<
        string,
        { countryCode?: string | null; countryName?: string | null; region?: string | null; city?: string | null }
      >();

      if (sessionsMissingGeo.length > 0) {
        const sessionIds = sessionsMissingGeo
          .map((session) => session.sessionId)
          .filter(Boolean);

        if (sessionIds.length > 0) {
          const geoEvents = await db.funnelEvent.findMany({
            where: {
              funnelId: input.funnelId,
              sessionId: { in: sessionIds },
              timestamp: {
                gte: startDate,
                lte: now,
              },
              OR: [
                { countryCode: { not: null } },
                { countryName: { not: null } },
                { city: { not: null } },
                { region: { not: null } },
              ],
            },
            orderBy: { timestamp: "desc" },
            select: {
              sessionId: true,
              countryCode: true,
              countryName: true,
              region: true,
              city: true,
            },
          });

          for (const event of geoEvents) {
            if (!sessionGeoFallback.has(event.sessionId)) {
              sessionGeoFallback.set(event.sessionId, {
                countryCode: event.countryCode,
                countryName: event.countryName,
                region: event.region,
                city: event.city,
              });
            }
          }
        }
      }

      // Group by country
      const countryMap = new Map<string, {
        countryCode: string;
        countryName: string;
        sessions: number;
        conversions: number;
        revenue: number;
        pageViews: number;
      }>();

      // Group by city
      const cityMap = new Map<string, {
        city: string;
        countryCode: string;
        countryName: string;
        sessions: number;
        conversions: number;
      }>();

      for (const session of sessions) {
        const fallbackGeo = sessionGeoFallback.get(session.sessionId);
        const resolvedCountryCode =
          hasKnownGeo(session.countryCode)
            ? session.countryCode
            : fallbackGeo?.countryCode;
        const resolvedCountryName =
          hasKnownGeo(session.countryName)
            ? session.countryName
            : fallbackGeo?.countryName;
        const resolvedCity =
          session.city || fallbackGeo?.city || null;

        // Country aggregation
        const countryCode = resolvedCountryCode || "Unknown";
        const countryName = resolvedCountryName || countryCode;
        
        if (!countryMap.has(countryCode)) {
          countryMap.set(countryCode, {
            countryCode,
            countryName,
            sessions: 0,
            conversions: 0,
            revenue: 0,
            pageViews: 0,
          });
        }
        const countryBucket = countryMap.get(countryCode)!;
        countryBucket.sessions += 1;
        countryBucket.pageViews += session.pageViews;
        if (session.converted) {
          countryBucket.conversions += 1;
        }
        countryBucket.revenue += Number(session.conversionValue || 0);

        // City aggregation
        if (resolvedCity) {
          const cityKey = `${resolvedCity}-${countryCode}`;
          if (!cityMap.has(cityKey)) {
            cityMap.set(cityKey, {
              city: resolvedCity,
              countryCode,
              countryName,
              sessions: 0,
              conversions: 0,
            });
          }
          const cityBucket = cityMap.get(cityKey)!;
          cityBucket.sessions += 1;
          if (session.converted) {
            cityBucket.conversions += 1;
          }
        }
      }

      // Convert to arrays and add percentages
      const totalSessions = sessions.length;

      const countries = Array.from(countryMap.values())
        .map(item => ({
          ...item,
          percentage: totalSessions > 0 ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0,
          conversionRate: item.sessions > 0 ? Number(((item.conversions / item.sessions) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions);

      const cities = Array.from(cityMap.values())
        .map(item => ({
          ...item,
          percentage: totalSessions > 0 ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 20); // Top 20 cities

      return {
        countries,
        cities,
        totalSessions,
        totalConversions: sessions.filter(s => s.converted).length,
        totalRevenue: sessions.reduce((sum, s) => sum + Number(s.conversionValue || 0), 0),
      };
    }),

  /**
   * Get visitor profiles list with pagination
   */
  getVisitorProfiles: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        filters: z
          .object({
            lifecycleStage: z.string().optional(),
            hasIdentified: z.boolean().optional(),
            searchQuery: z.string().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      const getLifecycleStage = (totalSessions: number, lastSeen?: Date | null) => {
        if (lastSeen) {
          const daysSinceLastSeen =
            (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastSeen >= 30) return "CHURNED";
        }
        if (totalSessions >= 5) return "LOYAL";
        if (totalSessions >= 2) return "RETURNING";
        return "NEW";
      };

      const lifecycleCandidates = await db.anonymousUserProfile.findMany({
        where: {
          lifecycleStage: null,
          sessions: {
            some: {
              funnelId: input.funnelId,
            },
          },
        },
        select: {
          id: true,
          totalSessions: true,
          lastSeen: true,
        },
      });

      if (lifecycleCandidates.length > 0) {
        await Promise.all(
          lifecycleCandidates.map((profile) =>
            db.anonymousUserProfile.update({
              where: { id: profile.id },
              data: {
                lifecycleStage: getLifecycleStage(
                  profile.totalSessions,
                  profile.lastSeen
                ),
              },
            })
          )
        );
      }

      // Build where clause
      const where: any = {};

      if (input.filters?.lifecycleStage) {
        where.lifecycleStage = input.filters.lifecycleStage;
      }

      if (input.filters?.hasIdentified !== undefined) {
        if (input.filters.hasIdentified) {
          where.identifiedUserId = { not: null };
        } else {
          where.identifiedUserId = null;
        }
      }

      if (input.filters?.searchQuery) {
        where.OR = [
          { displayName: { contains: input.filters.searchQuery, mode: "insensitive" } },
          { identifiedUserId: { contains: input.filters.searchQuery, mode: "insensitive" } },
        ];
      }

      // Get profiles with pagination - ONLY for visitors who have sessions in this funnel
      const profiles = await db.anonymousUserProfile.findMany({
        where: {
          ...where,
          sessions: {
            some: {
              funnelId: input.funnelId,
            },
          },
        },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
        orderBy: { lastSeen: "desc" },
        include: {
          sessions: {
            where: { funnelId: input.funnelId },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              countryCode: true,
              countryName: true,
              city: true,
              deviceType: true,
              browserName: true,
            },
          },
        },
      });

      const hasMore = profiles.length > input.limit;
      const items = hasMore ? profiles.slice(0, -1) : profiles;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return {
        items: items.map((profile) => ({
          ...profile,
          lastSession: profile.sessions[0] || null,
        })),
        nextCursor,
      };
    }),

  /**
   * Get single visitor profile with full journey
   */
  getVisitorProfile: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        anonymousId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      const profile = await db.anonymousUserProfile.findUnique({
        where: { id: input.anonymousId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Visitor profile not found",
        });
      }

      // Get all sessions for this visitor in this funnel
      const sessions = await db.funnelSession.findMany({
        where: {
          anonymousId: input.anonymousId,
          funnelId: input.funnelId,
        },
        orderBy: { startedAt: "desc" },
      });

      return {
        profile,
        sessions,
        totalSessions: sessions.length,
        totalConversions: sessions.filter((s) => s.converted).length,
        totalRevenue: sessions.reduce(
          (sum, s) => sum + Number(s.conversionValue || 0),
          0
        ),
        avgEngagementRate:
          sessions.length > 0
            ? sessions.reduce(
                (sum, s) => sum + Number(s.engagementRate || 0),
                0
              ) / sessions.length
            : 0,
        avgExperienceScore:
          sessions.length > 0
            ? sessions.reduce(
                (sum, s) => sum + Number(s.experienceScore || 0),
                0
              ) / sessions.length
            : 0,
      };
    }),

  /**
   * Get visitor journey (all events for a specific session)
   */
  getVisitorJourney: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Get session
      const session = await db.funnelSession.findUnique({
        where: { sessionId: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Get all events for this session
      const events = await db.funnelEvent.findMany({
        where: {
          sessionId: input.sessionId,
          funnelId: input.funnelId,
        },
        orderBy: { timestamp: "asc" },
      });

      return {
        session,
        events,
        timeline: events.map((event) => ({
          id: event.id,
          timestamp: event.timestamp,
          eventName: event.eventName,
          pageUrl: event.pageUrl,
          pageTitle: event.pageTitle,
          properties: event.eventProperties,
          isConversion: event.isConversion,
          revenue: event.revenue,
          // Core Web Vitals if available
          webVitals: {
            lcp: event.lcp,
            inp: event.inp,
            cls: event.cls,
            fcp: event.fcp,
            ttfb: event.ttfb,
            rating: event.vitalRating,
          },
        })),
      };
    }),

  /**
   * GDPR: Export visitor data
   */
  exportVisitorData: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        anonymousId: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Find profile by anonymousId or email
      let profile;
      if (input.anonymousId) {
        profile = await db.anonymousUserProfile.findUnique({
          where: { id: input.anonymousId },
        });
      } else if (input.email) {
        profile = await db.anonymousUserProfile.findFirst({
          where: { identifiedUserId: input.email },
        });
      }

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Visitor profile not found",
        });
      }

      // Get all sessions
      const sessions = await db.funnelSession.findMany({
        where: {
          anonymousId: profile.id,
          funnelId: input.funnelId,
        },
        orderBy: { startedAt: "desc" },
      });

      // Get all events
      const events = await db.funnelEvent.findMany({
        where: {
          anonymousId: profile.id,
          funnelId: input.funnelId,
        },
        orderBy: { timestamp: "desc" },
      });

      // Return all data in GDPR-compliant format
      return {
        profile: {
          anonymousId: profile.id,
          displayName: profile.displayName,
          identifiedUserId: profile.identifiedUserId,
          userProperties: profile.userProperties,
          firstSeen: profile.firstSeen,
          lastSeen: profile.lastSeen,
          totalSessions: profile.totalSessions,
          totalEvents: profile.totalEvents,
        },
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationSeconds: s.durationSeconds,
          pageViews: s.pageViews,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          deviceType: s.deviceType,
          browserName: s.browserName,
          countryCode: s.countryCode,
          city: s.city,
          converted: s.converted,
          conversionValue: s.conversionValue,
        })),
        events: events.map(e => ({
          eventId: e.eventId,
          eventName: e.eventName,
          timestamp: e.timestamp,
          pageUrl: e.pageUrl,
          pageTitle: e.pageTitle,
          ipAddress: e.ipAddress,
          userAgent: e.userAgent,
          deviceType: e.deviceType,
          countryCode: e.countryCode,
          city: e.city,
        })),
      };
    }),

  /**
   * GDPR: Delete visitor data
   */
  deleteVisitorData: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        anonymousId: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Find profile by anonymousId or email
      let profile;
      if (input.anonymousId) {
        profile = await db.anonymousUserProfile.findUnique({
          where: { id: input.anonymousId },
        });
      } else if (input.email) {
        profile = await db.anonymousUserProfile.findFirst({
          where: { identifiedUserId: input.email },
        });
      }

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Visitor profile not found",
        });
      }

      // Delete all events
      await db.funnelEvent.deleteMany({
        where: {
          anonymousId: profile.id,
          funnelId: input.funnelId,
        },
      });

      // Delete all sessions
      await db.funnelSession.deleteMany({
        where: {
          anonymousId: profile.id,
          funnelId: input.funnelId,
        },
      });

      // Delete profile
      await db.anonymousUserProfile.delete({
        where: { id: profile.id },
      });

      return { success: true, deletedProfileId: profile.id };
    }),

  /**
   * Get performance analytics (Core Web Vitals overview)
   */
  getPerformanceAnalytics: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Get all sessions in date range with Core Web Vitals
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        select: {
          avgLcp: true,
          avgInp: true,
          avgCls: true,
          avgFcp: true,
          avgTtfb: true,
          experienceScore: true,
          deviceType: true,
          countryCode: true,
        },
      });

      // Calculate overall averages
      const validLcp = sessions.filter((s) => s.avgLcp != null);
      const validInp = sessions.filter((s) => s.avgInp != null);
      const validCls = sessions.filter((s) => s.avgCls != null);
      const validFcp = sessions.filter((s) => s.avgFcp != null);
      const validTtfb = sessions.filter((s) => s.avgTtfb != null);
      const validScore = sessions.filter((s) => s.experienceScore != null);

      const avgLcp =
        validLcp.length > 0
          ? validLcp.reduce((sum, s) => sum + Number(s.avgLcp), 0) /
            validLcp.length
          : null;
      const avgInp =
        validInp.length > 0
          ? validInp.reduce((sum, s) => sum + Number(s.avgInp), 0) /
            validInp.length
          : null;
      const avgCls =
        validCls.length > 0
          ? validCls.reduce((sum, s) => sum + Number(s.avgCls), 0) /
            validCls.length
          : null;
      const avgFcp =
        validFcp.length > 0
          ? validFcp.reduce((sum, s) => sum + Number(s.avgFcp), 0) /
            validFcp.length
          : null;
      const avgTtfb =
        validTtfb.length > 0
          ? validTtfb.reduce((sum, s) => sum + Number(s.avgTtfb), 0) /
            validTtfb.length
          : null;
      const avgExperienceScore =
        validScore.length > 0
          ? Math.round(
              validScore.reduce((sum, s) => sum + Number(s.experienceScore), 0) /
                validScore.length
            )
          : null;

      // Group by device type
      const byDevice = sessions.reduce((acc: any, session) => {
        const device = session.deviceType || "Unknown";
        if (!acc[device]) {
          acc[device] = { lcp: [], inp: [], cls: [], fcp: [], ttfb: [], score: [] };
        }
        if (session.avgLcp) acc[device].lcp.push(Number(session.avgLcp));
        if (session.avgInp) acc[device].inp.push(Number(session.avgInp));
        if (session.avgCls) acc[device].cls.push(Number(session.avgCls));
        if (session.avgFcp) acc[device].fcp.push(Number(session.avgFcp));
        if (session.avgTtfb) acc[device].ttfb.push(Number(session.avgTtfb));
        if (session.experienceScore)
          acc[device].score.push(Number(session.experienceScore));
        return acc;
      }, {});

      const devicePerformance = Object.entries(byDevice).map(
        ([device, metrics]: [string, any]) => ({
          device,
          avgLcp:
            metrics.lcp.length > 0
              ? metrics.lcp.reduce((a: number, b: number) => a + b, 0) /
                metrics.lcp.length
              : null,
          avgInp:
            metrics.inp.length > 0
              ? metrics.inp.reduce((a: number, b: number) => a + b, 0) /
                metrics.inp.length
              : null,
          avgCls:
            metrics.cls.length > 0
              ? metrics.cls.reduce((a: number, b: number) => a + b, 0) /
                metrics.cls.length
              : null,
          avgExperienceScore:
            metrics.score.length > 0
              ? Math.round(
                  metrics.score.reduce((a: number, b: number) => a + b, 0) /
                    metrics.score.length
                )
              : null,
          sessions: metrics.score.length,
        })
      );

      return {
        overall: {
          avgLcp,
          avgInp,
          avgCls,
          avgFcp,
          avgTtfb,
          avgExperienceScore,
          totalSessions: sessions.length,
        },
        byDevice: devicePerformance,
      };
    }),

  /**
   * Get event category breakdown
   * Shows distribution of events by user-defined categories
   */
  getCategoryBreakdown: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const { funnelId, startDate, endDate } = input;

      const whereClause: any = {
        funnelId,
        isMicroConversion: true,
      };

      if (startDate && endDate) {
        whereClause.timestamp = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Get category stats
      const categoryStats = await db.funnelEvent.groupBy({
        by: ['eventCategory'],
        where: whereClause,
        _count: {
          id: true,
        },
        _avg: {
          microConversionValue: true,
        },
      });

      // Get conversion rate by category
      let categoryConversions: Array<{
        eventCategory: string;
        totalSessions: bigint;
        convertedSessions: bigint;
        conversionRate: number;
      }>;

      if (startDate && endDate) {
        categoryConversions = await db.$queryRaw`
          SELECT 
            e."eventCategory" as "eventCategory",
            COUNT(DISTINCT e."sessionId") as "totalSessions",
            COUNT(DISTINCT CASE WHEN s.converted THEN e."sessionId" END) as "convertedSessions",
            ROUND(
              (COUNT(DISTINCT CASE WHEN s.converted THEN e."sessionId" END)::numeric / 
               NULLIF(COUNT(DISTINCT e."sessionId"), 0) * 100), 
              2
            ) as "conversionRate"
          FROM funnel_event e
          LEFT JOIN funnel_session s ON e."sessionId" = s."sessionId"
          WHERE 
            e."funnelId" = ${funnelId}
            AND e."isMicroConversion" = true
            AND e.timestamp >= ${startDate}
            AND e.timestamp <= ${endDate}
          GROUP BY e."eventCategory"
          ORDER BY "conversionRate" DESC NULLS LAST
        `;
      } else {
        categoryConversions = await db.$queryRaw`
          SELECT 
            e."eventCategory" as "eventCategory",
            COUNT(DISTINCT e."sessionId") as "totalSessions",
            COUNT(DISTINCT CASE WHEN s.converted THEN e."sessionId" END) as "convertedSessions",
            ROUND(
              (COUNT(DISTINCT CASE WHEN s.converted THEN e."sessionId" END)::numeric / 
               NULLIF(COUNT(DISTINCT e."sessionId"), 0) * 100), 
              2
            ) as "conversionRate"
          FROM funnel_event e
          LEFT JOIN funnel_session s ON e."sessionId" = s."sessionId"
          WHERE 
            e."funnelId" = ${funnelId}
            AND e."isMicroConversion" = true
          GROUP BY e."eventCategory"
          ORDER BY "conversionRate" DESC NULLS LAST
        `;
      }

      // Combine stats
      const categories = categoryStats.map((cat) => {
        const convData = categoryConversions.find(
          (c) => c.eventCategory === cat.eventCategory
        );

        return {
          category: cat.eventCategory || 'uncategorized',
          count: cat._count.id,
          avgValue: cat._avg.microConversionValue
            ? Number(cat._avg.microConversionValue.toFixed(1))
            : 0,
          totalSessions: convData ? Number(convData.totalSessions) : 0,
          convertedSessions: convData ? Number(convData.convertedSessions) : 0,
          conversionRate: convData ? Number(convData.conversionRate) : 0,
        };
      });

      return {
        categories: categories.sort((a, b) => b.count - a.count),
        totalEvents: categories.reduce((sum, cat) => sum + cat.count, 0),
      };
    }),

  /**
   * Get top micro-conversion events
   * Shows which specific events correlate with conversions
   */
  getTopMicroConversions: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const { funnelId, startDate, endDate, limit } = input;

      const topEvents = await db.$queryRaw<
        Array<{
          eventName: string;
          eventCategory: string;
          eventDescription: string | null;
          totalOccurrences: bigint;
          uniqueSessions: bigint;
          avgValue: number;
          convertedSessions: bigint;
          conversionRate: number;
        }>
      >`
        SELECT 
          e.microConversionType as "eventName",
          e.eventCategory as "eventCategory",
          e.eventDescription as "eventDescription",
          COUNT(*) as "totalOccurrences",
          COUNT(DISTINCT e.sessionId) as "uniqueSessions",
          ROUND(AVG(e.microConversionValue)::numeric, 1) as "avgValue",
          COUNT(DISTINCT CASE WHEN s.converted THEN e.sessionId END) as "convertedSessions",
          ROUND(
            (COUNT(DISTINCT CASE WHEN s.converted THEN e.sessionId END)::numeric / 
             NULLIF(COUNT(DISTINCT e.sessionId), 0) * 100), 
            2
          ) as "conversionRate"
        FROM funnel_event e
        LEFT JOIN funnel_session s ON e.sessionId = s.sessionId
        WHERE 
          e.funnelId = ${funnelId}
          AND e.isMicroConversion = true
          ${startDate && endDate ? `AND e.timestamp >= ${startDate} AND e.timestamp <= ${endDate}` : ''}
        GROUP BY e.microConversionType, e.eventCategory, e.eventDescription
        HAVING COUNT(DISTINCT e.sessionId) >= 5
        ORDER BY "conversionRate" DESC, "uniqueSessions" DESC
        LIMIT ${limit}
      `;

      return topEvents.map((event) => ({
        eventName: event.eventName,
        category: event.eventCategory || 'uncategorized',
        description: event.eventDescription,
        totalOccurrences: Number(event.totalOccurrences),
        uniqueSessions: Number(event.uniqueSessions),
        avgValue: Number(event.avgValue),
        convertedSessions: Number(event.convertedSessions),
        conversionRate: Number(event.conversionRate),
      }));
    }),

  /**
   * Get funnel stage flow
   * Shows progression through funnel stages with drop-off rates
   */
  getFunnelStageFlow: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const { funnelId, startDate, endDate } = input;

      const stageFlow = await db.$queryRaw<
        Array<{
          stage: string;
          sessions: bigint;
          conversions: bigint;
          avgTimeInStage: number;
          abandonments: bigint;
        }>
      >`
        SELECT 
          s.currentStage as stage,
          COUNT(*) as sessions,
          COUNT(CASE WHEN s.converted THEN 1 END) as conversions,
          AVG(
            CASE 
              WHEN s.endedAt IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (s.endedAt - s.startedAt))
              ELSE NULL
            END
          ) as "avgTimeInStage",
          COUNT(CASE WHEN s.isAbandoned THEN 1 END) as abandonments
        FROM funnel_session s
        WHERE 
          s.funnelId = ${funnelId}
          AND s.currentStage IS NOT NULL
          ${startDate && endDate ? `AND s.startedAt >= ${startDate} AND s.startedAt <= ${endDate}` : ''}
        GROUP BY s.currentStage
        ORDER BY 
          CASE s.currentStage
            WHEN 'awareness' THEN 1
            WHEN 'interest' THEN 2
            WHEN 'desire' THEN 3
            WHEN 'checkout' THEN 4
            WHEN 'purchase' THEN 5
            WHEN 'abandoned' THEN 6
            ELSE 7
          END
      `;

      const stages = stageFlow.map((stage, index) => {
        const prevStage = stageFlow[index - 1];
        const dropOffRate = prevStage
          ? ((Number(prevStage.sessions) - Number(stage.sessions)) /
              Number(prevStage.sessions)) *
            100
          : 0;

        return {
          stage: stage.stage,
          sessions: Number(stage.sessions),
          conversions: Number(stage.conversions),
          conversionRate:
            Number(stage.sessions) > 0
              ? (Number(stage.conversions) / Number(stage.sessions)) * 100
              : 0,
          avgTimeInStage: stage.avgTimeInStage
            ? Math.round(Number(stage.avgTimeInStage))
            : null,
          abandonments: Number(stage.abandonments),
          dropOffRate: index > 0 ? Number(dropOffRate.toFixed(2)) : 0,
        };
      });

      return {
        stages,
        totalSessions: stages.length > 0 ? stages[0].sessions : 0,
        finalConversions: stages.find((s) => s.stage === 'purchase')?.sessions || 0,
        overallConversionRate:
          stages.length > 0 && stages[0].sessions > 0
            ? (
                ((stages.find((s) => s.stage === 'purchase')?.sessions || 0) /
                  stages[0].sessions) *
                100
              ).toFixed(2)
            : '0.00',
      };
    }),

  /**
   * Get session journey details
   * Shows complete event sequence for a specific session
   */
  getSessionJourney: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { sessionId } = input;

      const session = await db.funnelSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      const events = await db.funnelEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        select: {
          eventId: true,
          eventName: true,
          eventCategory: true,
          eventDescription: true,
          microConversionType: true,
          microConversionValue: true,
          funnelStage: true,
          timestamp: true,
          pageUrl: true,
          pageTitle: true,
        },
      });

      return {
        session: {
          sessionId: session.sessionId,
          anonymousId: session.anonymousId,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          currentStage: session.currentStage,
          converted: session.converted,
          conversionValue: session.conversionValue
            ? Number(session.conversionValue)
            : null,
          durationSeconds: session.durationSeconds,
          activeTimeSeconds: session.activeTimeSeconds,
          engagementRate: session.engagementRate,
          deviceType: session.deviceType,
          browserName: session.browserName,
          city: session.city,
          countryName: session.countryName,
        },
        events: events.map((event) => ({
          eventId: event.eventId,
          eventName: event.eventName,
          category: event.eventCategory,
          description: event.eventDescription,
          microConversionType: event.microConversionType,
          value: event.microConversionValue,
          stage: event.funnelStage,
          timestamp: event.timestamp,
          pageUrl: event.pageUrl,
          pageTitle: event.pageTitle,
        })),
        stageHistory: session.stageHistory as Array<{
          stage: string;
          enteredAt: number;
        }>,
      };
    }),

  /**
   * Get ad performance analytics
   * Shows conversion data broken down by ad platform (Facebook, Google, TikTok, etc.)
   */
  getAdPerformance: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d", "all"]).default("7d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findUnique({
        where: { id: input.funnelId },
        select: { organizationId: true },
      });

      if (!funnel || funnel.organizationId !== ctx.orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate time filter
      const now = new Date();
      let startDate = new Date(0); // Beginning of time
      
      if (input.timeRange === "24h") {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (input.timeRange === "7d") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (input.timeRange === "30d") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (input.timeRange === "90d") {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      }

      // Get all sessions with conversions
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          converted: true,
          startedAt: {
            gte: startDate,
          },
        },
        select: {
          id: true,
          conversionPlatform: true,
          conversionValue: true,
          firstFbclid: true,
          firstGclid: true,
          firstTtclid: true,
          lastFbclid: true,
          lastGclid: true,
          lastTtclid: true,
          firstSource: true,
          firstMedium: true,
          firstCampaign: true,
          lastSource: true,
          lastMedium: true,
          lastCampaign: true,
          startedAt: true,
        },
      });

      // Group by platform
      const platformStats = sessions.reduce((acc: any, session: any) => {
        const platform = session.conversionPlatform || 'unknown';
        
        if (!acc[platform]) {
          acc[platform] = {
            platform,
            conversions: 0,
            revenue: 0,
            firstTouch: 0,
            lastTouch: 0,
            sessions: [],
          };
        }

        acc[platform].conversions += 1;
        acc[platform].revenue += Number(session.conversionValue || 0);
        
        // Check if this was first-touch or last-touch attribution
        const isFirstTouch = !!(
          session.firstFbclid || 
          session.firstGclid || 
          session.firstTtclid
        );
        const isLastTouch = !!(
          session.lastFbclid || 
          session.lastGclid || 
          session.lastTtclid
        );

        if (isFirstTouch) acc[platform].firstTouch += 1;
        if (isLastTouch) acc[platform].lastTouch += 1;
        
        acc[platform].sessions.push(session);

        return acc;
      }, {});

      // Convert to array and calculate metrics
      const platformData = Object.values(platformStats).map((stats: any) => {
        const { sessions: platformSessions, ...rest } = stats;
        
        // Group by campaign
        const campaigns = platformSessions.reduce((acc: any, session: any) => {
          const campaign = session.lastCampaign || session.firstCampaign || 'unknown';
          
          if (!acc[campaign]) {
            acc[campaign] = {
              campaign,
              conversions: 0,
              revenue: 0,
            };
          }

          acc[campaign].conversions += 1;
          acc[campaign].revenue += Number(session.conversionValue || 0);

          return acc;
        }, {});

        return {
          ...rest,
          averageOrderValue: stats.conversions > 0 
            ? stats.revenue / stats.conversions 
            : 0,
          topCampaigns: Object.values(campaigns)
            .sort((a: any, b: any) => b.revenue - a.revenue)
            .slice(0, 5),
        };
      });

      // Sort by revenue
      platformData.sort((a: any, b: any) => b.revenue - a.revenue);

      // Calculate totals
      const totalConversions = sessions.length;
      const totalRevenue = sessions.reduce(
        (sum: number, s: any) => sum + Number(s.conversionValue || 0), 
        0
      );

      // Get timeline data (conversions over time)
      const timeline = sessions.reduce((acc: any, session: any) => {
        const date = session.startedAt.toISOString().split('T')[0];
        const platform = session.conversionPlatform || 'unknown';

        if (!acc[date]) {
          acc[date] = { date, total: 0 };
        }

        acc[date][platform] = (acc[date][platform] || 0) + 1;
        acc[date].total += 1;

        return acc;
      }, {});

      const timelineData = Object.values(timeline).sort((a: any, b: any) => 
        a.date.localeCompare(b.date)
      );

      return {
        summary: {
          totalConversions,
          totalRevenue,
          averageOrderValue: totalConversions > 0 ? totalRevenue / totalConversions : 0,
        },
        platforms: platformData,
        timeline: timelineData,
      };
    }),

  /**
   * Get conversions grouped by platform (simple version without ad spend data)
   */
  getConversionsByPlatform: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "all"]).default("7d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findUnique({
        where: { id: input.funnelId },
        select: { organizationId: true },
      });

      if (!funnel || funnel.organizationId !== ctx.orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate time filter
      const now = new Date();
      let startDate = new Date(0);
      
      if (input.timeRange === "24h") {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (input.timeRange === "7d") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (input.timeRange === "30d") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get converted sessions
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          converted: true,
          startedAt: { gte: startDate },
        },
        select: {
          conversionPlatform: true,
          conversionValue: true,
          firstFbclid: true,
          firstGclid: true,
          firstTtclid: true,
          lastFbclid: true,
          lastGclid: true,
          lastTtclid: true,
          lastCampaign: true,
          firstCampaign: true,
        },
      });

      // Group by platform
      const platformMap = new Map();
      const campaignMap = new Map();
      
      const firstTouch = { facebook: 0, google: 0, tiktok: 0, direct: 0 };
      const lastTouch = { facebook: 0, google: 0, tiktok: 0, direct: 0 };
      const firstTouchRevenue = { facebook: 0, google: 0, tiktok: 0, direct: 0 };
      const lastTouchRevenue = { facebook: 0, google: 0, tiktok: 0, direct: 0 };

      for (const session of sessions) {
        const platform = session.conversionPlatform || "unknown";
        const value = Number(session.conversionValue || 0);

        // Platform aggregation
        if (!platformMap.has(platform)) {
          platformMap.set(platform, {
            platform,
            conversions: 0,
            revenue: 0,
            firstTouch: 0,
            lastTouch: 0,
          });
        }

        const platformData = platformMap.get(platform);
        platformData.conversions += 1;
        platformData.revenue += value;

        // Attribution
        if (session.firstFbclid) {
          platformData.firstTouch += 1;
          firstTouch.facebook += 1;
          firstTouchRevenue.facebook += value;
        } else if (session.firstGclid) {
          platformData.firstTouch += 1;
          firstTouch.google += 1;
          firstTouchRevenue.google += value;
        } else if (session.firstTtclid) {
          platformData.firstTouch += 1;
          firstTouch.tiktok += 1;
          firstTouchRevenue.tiktok += value;
        } else {
          firstTouch.direct += 1;
          firstTouchRevenue.direct += value;
        }

        if (session.lastFbclid) {
          platformData.lastTouch += 1;
          lastTouch.facebook += 1;
          lastTouchRevenue.facebook += value;
        } else if (session.lastGclid) {
          platformData.lastTouch += 1;
          lastTouch.google += 1;
          lastTouchRevenue.google += value;
        } else if (session.lastTtclid) {
          platformData.lastTouch += 1;
          lastTouch.tiktok += 1;
          lastTouchRevenue.tiktok += value;
        } else {
          lastTouch.direct += 1;
          lastTouchRevenue.direct += value;
        }

        // Campaign aggregation
        const campaign = session.lastCampaign || session.firstCampaign || "unknown";
        const campaignKey = `${platform}-${campaign}`;
        
        if (!campaignMap.has(campaignKey)) {
          campaignMap.set(campaignKey, {
            platform,
            campaign,
            conversions: 0,
            revenue: 0,
          });
        }

        const campaignData = campaignMap.get(campaignKey);
        campaignData.conversions += 1;
        campaignData.revenue += value;
      }

      // Convert to arrays and calculate averages
      const platforms = Array.from(platformMap.values())
        .map((p) => ({
          ...p,
          averageOrderValue: p.conversions > 0 ? p.revenue / p.conversions : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      const campaigns = Array.from(campaignMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const totalConversions = sessions.length;
      const totalRevenue = sessions.reduce((sum, s) => sum + Number(s.conversionValue || 0), 0);

      return {
        summary: {
          totalConversions,
          totalRevenue,
          averageOrderValue: totalConversions > 0 ? totalRevenue / totalConversions : 0,
        },
        platforms,
        campaigns,
        attribution: {
          firstTouch: {
            conversions: firstTouch,
            revenue: firstTouchRevenue,
          },
          lastTouch: {
            conversions: lastTouch,
            revenue: lastTouchRevenue,
          },
        },
      };
    }),

  /**
   * Get event properties breakdown for a specific event
   */
  getEventPropertiesBreakdown: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        eventName: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Get all events matching the event name
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          eventName: input.eventName,
          createdAt: { gte: dateFrom },
        },
        select: {
          eventProperties: true,
          revenue: true,
        },
      });

      if (events.length === 0) {
        return {
          eventName: input.eventName,
          totalEvents: 0,
          properties: [],
        };
      }

      // Discover all unique property keys
      const propertyKeys = new Set<string>();
      for (const event of events) {
        const props = event.eventProperties as Record<string, any>;
        for (const key of Object.keys(props)) {
          propertyKeys.add(key);
        }
      }

      // For each property key, aggregate values
      const propertiesBreakdown = Array.from(propertyKeys).map((propertyKey) => {
        const valueMap = new Map<string, {
          value: string;
          count: number;
          revenue: number;
          percentage: number;
        }>();

        for (const event of events) {
          const props = event.eventProperties as Record<string, any>;
          const value = props[propertyKey]?.toString() || "Unknown";
          
          if (!valueMap.has(value)) {
            valueMap.set(value, { value, count: 0, revenue: 0, percentage: 0 });
          }
          
          const item = valueMap.get(value)!;
          item.count += 1;
          item.revenue += Number(event.revenue || 0);
        }

        // Calculate percentages and sort by count
        const total = events.length;
        const breakdown = Array.from(valueMap.values())
          .map(item => ({
            ...item,
            percentage: (item.count / total) * 100,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, input.limit);

        return {
          propertyKey,
          totalValues: breakdown.length,
          breakdown,
        };
      });

      return {
        eventName: input.eventName,
        totalEvents: events.length,
        properties: propertiesBreakdown,
      };
    }),

  /**
   * Get event frequency distribution - how many users triggered event X times
   */
  getEventFrequencyDistribution: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        eventName: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Get all events matching the event name, grouped by visitor
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          eventName: input.eventName,
          createdAt: { gte: dateFrom },
        },
        select: {
          anonymousId: true,
          userId: true,
        },
      });

      // Count events per user
      const userEventCounts = new Map<string, number>();
      
      for (const event of events) {
        const userId = event.userId || event.anonymousId;
        if (userId) {
          userEventCounts.set(userId, (userEventCounts.get(userId) || 0) + 1);
        }
      }

      // Create frequency buckets
      const frequencyMap = new Map<string, number>();
      const buckets = ["1", "2", "3", "4", "5", "6-10", "11-20", "21+"];
      
      for (const count of userEventCounts.values()) {
        let bucket: string;
        if (count === 1) bucket = "1";
        else if (count === 2) bucket = "2";
        else if (count === 3) bucket = "3";
        else if (count === 4) bucket = "4";
        else if (count === 5) bucket = "5";
        else if (count >= 6 && count <= 10) bucket = "6-10";
        else if (count >= 11 && count <= 20) bucket = "11-20";
        else bucket = "21+";
        
        frequencyMap.set(bucket, (frequencyMap.get(bucket) || 0) + 1);
      }

      // Calculate totals
      const totalUsers = userEventCounts.size;
      const totalEvents = events.length;
      const avgFrequency = totalUsers > 0 ? totalEvents / totalUsers : 0;

      // Build distribution array
      const distribution = buckets
        .map((bucket) => {
          const userCount = frequencyMap.get(bucket) || 0;
          const percentage = totalUsers > 0 ? (userCount / totalUsers) * 100 : 0;
          
          // Calculate total events in this bucket
          let totalEventsInBucket = 0;
          for (const [userId, count] of userEventCounts.entries()) {
            if (bucket === "1" && count === 1) totalEventsInBucket += count;
            else if (bucket === "2" && count === 2) totalEventsInBucket += count;
            else if (bucket === "3" && count === 3) totalEventsInBucket += count;
            else if (bucket === "4" && count === 4) totalEventsInBucket += count;
            else if (bucket === "5" && count === 5) totalEventsInBucket += count;
            else if (bucket === "6-10" && count >= 6 && count <= 10) totalEventsInBucket += count;
            else if (bucket === "11-20" && count >= 11 && count <= 20) totalEventsInBucket += count;
            else if (bucket === "21+" && count >= 21) totalEventsInBucket += count;
          }
          
          return {
            bucket,
            label: bucket + "x",
            userCount,
            totalEvents: totalEventsInBucket,
            percentage,
          };
        })
        .filter((item) => item.userCount > 0) // Only show non-empty buckets
        .sort((a, b) => {
          // Sort by bucket order
          const order = ["1", "2", "3", "4", "5", "6-10", "11-20", "21+"];
          return order.indexOf(a.bucket) - order.indexOf(b.bucket);
        });

      return {
        eventName: input.eventName,
        totalUsers,
        totalEvents,
        avgFrequency,
        distribution,
      };
    }),

  /**
   * Get event geography distribution - shows where events are coming from
   */
  getEventGeography: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        eventName: z.string().optional(), // Optional - shows all events if not provided
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Build where clause
      const whereClause: any = {
        funnelId: input.funnelId,
        createdAt: { gte: dateFrom },
      };

      if (input.eventName) {
        whereClause.eventName = input.eventName;
      }

      // Get all events with geo data
      const events = await db.funnelEvent.findMany({
        where: whereClause,
        select: {
          countryCode: true,
          countryName: true,
          city: true,
          region: true,
          revenue: true,
        },
      });

      // Group by country
      const countryMap = new Map<string, {
        countryCode: string;
        countryName: string;
        count: number;
        revenue: number;
        percentage: number;
      }>();

      for (const event of events) {
        const countryCode = event.countryCode || "Unknown";
        const countryName = event.countryName || countryCode;

        if (!countryMap.has(countryCode)) {
          countryMap.set(countryCode, {
            countryCode,
            countryName,
            count: 0,
            revenue: 0,
            percentage: 0,
          });
        }

        const country = countryMap.get(countryCode)!;
        country.count += 1;
        country.revenue += Number(event.revenue || 0);
      }

      // Calculate percentages and sort by count
      const totalEvents = events.length;
      const countries = Array.from(countryMap.values())
        .map((country) => ({
          ...country,
          percentage: totalEvents > 0 ? (country.count / totalEvents) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, input.limit);

      // Group by city (top cities)
      const cityMap = new Map<string, {
        city: string;
        countryName: string;
        count: number;
        percentage: number;
      }>();

      for (const event of events) {
        if (event.city) {
          const cityKey = `${event.city}-${event.countryCode || "Unknown"}`;
          const cityName = event.city;
          const countryName = event.countryName || event.countryCode || "Unknown";

          if (!cityMap.has(cityKey)) {
            cityMap.set(cityKey, {
              city: cityName,
              countryName,
              count: 0,
              percentage: 0,
            });
          }

          const city = cityMap.get(cityKey)!;
          city.count += 1;
        }
      }

      const cities = Array.from(cityMap.values())
        .map((city) => ({
          ...city,
          percentage: totalEvents > 0 ? (city.count / totalEvents) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, input.limit);

      return {
        eventName: input.eventName || "All Events",
        totalEvents,
        totalCountries: countryMap.size,
        totalCities: cityMap.size,
        countries,
        cities,
      };
    }),

  /**
   * Get purchase activity heatmap - shows when conversions happen (day × hour)
   */
  getPurchaseActivityHeatmap: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["7d", "30d", "90d"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = parseInt(input.timeRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);

      // Get all conversion events
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          isConversion: true,
          createdAt: { gte: dateFrom },
        },
        select: {
          timestamp: true,
          revenue: true,
        },
      });

      // Initialize heatmap grid (7 days × 24 hours)
      const heatmapGrid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
      const revenueGrid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));

      // Populate grid
      for (const event of events) {
        const dayOfWeek = event.timestamp.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = event.timestamp.getHours(); // 0-23
        
        heatmapGrid[dayOfWeek][hour] += 1;
        revenueGrid[dayOfWeek][hour] += Number(event.revenue || 0);
      }

      // Find peak time
      let maxPurchases = 0;
      let peakDay = 0;
      let peakHour = 0;

      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          if (heatmapGrid[day][hour] > maxPurchases) {
            maxPurchases = heatmapGrid[day][hour];
            peakDay = day;
            peakHour = hour;
          }
        }
      }

      // Convert grid to structured data
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const heatmapData = heatmapGrid.map((hourData, dayIndex) => ({
        day: days[dayIndex],
        dayIndex,
        hours: hourData.map((count, hourIndex) => ({
          hour: hourIndex,
          count,
          revenue: revenueGrid[dayIndex][hourIndex],
        })),
      }));

      return {
        heatmapData,
        totalPurchases: events.length,
        totalRevenue: events.reduce((sum, e) => sum + Number(e.revenue || 0), 0),
        peakTime: {
          day: days[peakDay],
          dayIndex: peakDay,
          hour: peakHour,
          count: maxPurchases,
          revenue: revenueGrid[peakDay][peakHour],
        },
        maxPurchases, // For color scaling
      };
    }),

  /**
   * Get event device breakdown - shows which devices trigger events
   */
  getEventDevices: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        eventName: z.string().optional(), // Optional - shows all events if not provided
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Build where clause
      const whereClause: any = {
        funnelId: input.funnelId,
        createdAt: { gte: dateFrom },
      };

      if (input.eventName) {
        whereClause.eventName = input.eventName;
      }

      // Get all events with device data
      const events = await db.funnelEvent.findMany({
        where: whereClause,
        select: {
          deviceType: true,
          revenue: true,
        },
      });

      // Group by device type
      const deviceMap = new Map<string, {
        deviceType: string;
        count: number;
        revenue: number;
        percentage: number;
      }>();

      for (const event of events) {
        const deviceType = event.deviceType || "Unknown";

        if (!deviceMap.has(deviceType)) {
          deviceMap.set(deviceType, {
            deviceType,
            count: 0,
            revenue: 0,
            percentage: 0,
          });
        }

        const device = deviceMap.get(deviceType)!;
        device.count += 1;
        device.revenue += Number(event.revenue || 0);
      }

      // Calculate percentages and sort by count
      const totalEvents = events.length;
      const devices = Array.from(deviceMap.values())
        .map((device) => ({
          ...device,
          percentage: totalEvents > 0 ? (device.count / totalEvents) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, input.limit);

      return {
        eventName: input.eventName || "All Events",
        totalEvents,
        totalDevices: deviceMap.size,
        devices,
      };
    }),

  /**
   * Get event browser breakdown - shows which browsers trigger events
   */
  getEventBrowsers: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        eventName: z.string().optional(), // Optional - shows all events if not provided
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Build where clause
      const whereClause: any = {
        funnelId: input.funnelId,
        createdAt: { gte: dateFrom },
      };

      if (input.eventName) {
        whereClause.eventName = input.eventName;
      }

      // Get all events with browser data
      const events = await db.funnelEvent.findMany({
        where: whereClause,
        select: {
          browserName: true,
          browserVersion: true,
          revenue: true,
        },
      });

      // Group by browser name
      const browserMap = new Map<string, {
        browserName: string;
        count: number;
        revenue: number;
        percentage: number;
        versions: Map<string, number>;
      }>();

      for (const event of events) {
        const browserName = event.browserName || "Unknown";
        const browserVersion = event.browserVersion || "Unknown";

        if (!browserMap.has(browserName)) {
          browserMap.set(browserName, {
            browserName,
            count: 0,
            revenue: 0,
            percentage: 0,
            versions: new Map(),
          });
        }

        const browser = browserMap.get(browserName)!;
        browser.count += 1;
        browser.revenue += Number(event.revenue || 0);
        
        // Track version distribution
        browser.versions.set(
          browserVersion,
          (browser.versions.get(browserVersion) || 0) + 1
        );
      }

      // Calculate percentages and sort by count
      const totalEvents = events.length;
      const browsers = Array.from(browserMap.values())
        .map((browser) => {
          // Get top version
          const topVersion = Array.from(browser.versions.entries())
            .sort((a, b) => b[1] - a[1])[0];

          return {
            browserName: browser.browserName,
            count: browser.count,
            revenue: browser.revenue,
            percentage: totalEvents > 0 ? (browser.count / totalEvents) * 100 : 0,
            topVersion: topVersion ? topVersion[0] : "Unknown",
            totalVersions: browser.versions.size,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, input.limit);

      return {
        eventName: input.eventName || "All Events",
        totalEvents,
        totalBrowsers: browserMap.size,
        browsers,
      };
    }),

  /**
   * Get event engagement rates - shows which events keep users engaged
   * Only includes events from sessions that have engagement data
   */
  getEventEngagement: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Get all sessions with engagement data in the time range
      const sessions = await db.funnelSession.findMany({
        where: {
          funnelId: input.funnelId,
          startedAt: { gte: dateFrom },
          engagementRate: { not: null }, // Only sessions with engagement tracking
        },
        select: {
          id: true,
          sessionId: true,
          engagementRate: true,
          durationSeconds: true,
          activeTimeSeconds: true,
          converted: true,
          conversionValue: true,
        },
      });

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          avgEngagement: 0,
          events: [],
        };
      }

      // Get all events from these sessions
      const sessionIds = sessions.map(s => s.sessionId);
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          sessionId: { in: sessionIds },
          createdAt: { gte: dateFrom },
        },
        select: {
          eventName: true,
          sessionId: true,
          revenue: true,
        },
      });

      // Map sessions by sessionId for quick lookup
      const sessionMap = new Map(
        sessions.map(s => [s.sessionId, s])
      );

      // Group events and calculate engagement metrics
      // Use Map to track which sessions we've already counted
      const eventEngagementMap = new Map<string, {
        eventName: string;
        totalOccurrences: number;
        sessionData: Map<string, { duration: number; activeTime: number; converted: boolean; value: number }>;
      }>();

      for (const event of events) {
        const session = sessionMap.get(event.sessionId);
        if (!session || session.engagementRate === null) continue;

        if (!eventEngagementMap.has(event.eventName)) {
          eventEngagementMap.set(event.eventName, {
            eventName: event.eventName,
            totalOccurrences: 0,
            sessionData: new Map(),
          });
        }

        const eventData = eventEngagementMap.get(event.eventName)!;
        eventData.totalOccurrences += 1;
        
        // Only store session data once per unique session
        if (!eventData.sessionData.has(event.sessionId)) {
          eventData.sessionData.set(event.sessionId, {
            duration: session.durationSeconds || 0,
            activeTime: session.activeTimeSeconds || 0,
            converted: session.converted || false,
            value: Number(session.conversionValue || 0),
          });
        }
      }

      // Calculate averages and format results
      const eventEngagementData = Array.from(eventEngagementMap.values())
        .map(data => {
          const sessionCount = data.sessionData.size;
          
          // Aggregate session data and calculate engagement per session
          let totalDuration = 0;
          let totalActiveTime = 0;
          let totalEngagement = 0;
          let conversions = 0;
          let revenue = 0;
          
          for (const sessionData of data.sessionData.values()) {
            totalDuration += sessionData.duration;
            totalActiveTime += sessionData.activeTime;
            
            // Calculate engagement for THIS session
            const sessionEngagement = sessionData.duration > 0
              ? Math.min((sessionData.activeTime / sessionData.duration) * 100, 100)
              : 0;
            totalEngagement += sessionEngagement;
            
            if (sessionData.converted) {
              conversions += 1;
              revenue += sessionData.value;
            }
          }
          
          const avgDuration = sessionCount > 0
            ? Math.round(totalDuration / sessionCount)
            : 0;
          
          const avgActiveTime = sessionCount > 0
            ? Math.round(totalActiveTime / sessionCount)
            : 0;
          
          // Engagement = average of per-session engagement rates
          const avgEngagement = sessionCount > 0
            ? totalEngagement / sessionCount
            : 0;
          
          const conversionRate = sessionCount > 0
            ? (conversions / sessionCount) * 100
            : 0;

          return {
            eventName: data.eventName,
            occurrences: data.totalOccurrences,
            sessions: sessionCount,
            avgEngagement: Number(avgEngagement.toFixed(1)),
            avgDuration,
            avgActiveTime,
            conversions,
            conversionRate: Number(conversionRate.toFixed(1)),
            revenue,
          };
        })
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, input.limit);

      // Calculate overall stats
      const totalSessionsWithEngagement = sessions.length;
      const overallAvgEngagement = sessions.reduce(
        (sum, s) => sum + Number(s.engagementRate || 0), 
        0
      ) / totalSessionsWithEngagement;

      return {
        totalSessions: totalSessionsWithEngagement,
        avgEngagement: Number(overallAvgEngagement.toFixed(1)),
        events: eventEngagementData,
      };
    }),

  /**
   * Get event category breakdown over time - shows trends in event types
   */
  getEventCategoryTrend: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        interval: z.enum(["15min", "30min", "hour", "4hour", "day"]).default("4hour"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Get all events in time range
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          createdAt: { gte: dateFrom },
        },
        select: {
          eventCategory: true,
          createdAt: true,
          isConversion: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (events.length === 0) {
        return {
          totalEvents: 0,
          data: [],
          categories: [],
        };
      }

      // Use the interval from input
      const bucketSize = input.interval;

      // Group events by time bucket and category
      const bucketMap = new Map<string, Map<string, number>>();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (const event of events) {
        // Create bucket key
        const date = new Date(event.createdAt);
        let bucketKey: string;
        
        if (bucketSize === '15min') {
          const minuteBlock = Math.floor(date.getMinutes() / 15) * 15;
          const formattedMinute = minuteBlock.toString().padStart(2, '0');
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getHours()}:${formattedMinute}`;
        } else if (bucketSize === '30min') {
          const minuteBlock = Math.floor(date.getMinutes() / 30) * 30;
          const formattedMinute = minuteBlock.toString().padStart(2, '0');
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getHours()}:${formattedMinute}`;
        } else if (bucketSize === 'hour') {
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getHours()}:00`;
        } else if (bucketSize === '4hour') {
          const hourBlock = Math.floor(date.getHours() / 4) * 4;
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${hourBlock}:00`;
        } else {
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()}`;
        }

        // Get or create bucket
        if (!bucketMap.has(bucketKey)) {
          bucketMap.set(bucketKey, new Map());
        }
        
        const categoryMap = bucketMap.get(bucketKey)!;
        const category = event.isConversion ? 'conversion' : (event.eventCategory || 'uncategorized');
        
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      }

      // Get all unique categories
      const allCategories = new Set<string>();
      for (const categoryMap of bucketMap.values()) {
        for (const category of categoryMap.keys()) {
          allCategories.add(category);
        }
      }

      // Format data for chart
      const chartData = Array.from(bucketMap.entries()).map(([bucket, categoryMap]) => {
        const dataPoint: Record<string, any> = { date: bucket };
        
        for (const category of allCategories) {
          dataPoint[category] = categoryMap.get(category) || 0;
        }
        
        return dataPoint;
      });

      return {
        totalEvents: events.length,
        data: chartData,
        categories: Array.from(allCategories).sort(),
      };
    }),

  /**
   * Get events over time - shows total event volume trends
   */
  getEventsOverTime: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        timeRange: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
        interval: z.enum(["15min", "30min", "hour", "4hour", "day"]).default("4hour"),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });

      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }

      // Calculate date range
      const daysAgo = input.timeRange === "24h" ? 1 : parseInt(input.timeRange);
      const dateFrom = new Date();
      if (input.timeRange === "24h") {
        dateFrom.setHours(dateFrom.getHours() - 24);
      } else {
        dateFrom.setDate(dateFrom.getDate() - daysAgo);
      }

      // Get all events in time range
      const events = await db.funnelEvent.findMany({
        where: {
          funnelId: input.funnelId,
          createdAt: { gte: dateFrom },
        },
        select: {
          createdAt: true,
          isConversion: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (events.length === 0) {
        return {
          totalEvents: 0,
          totalConversions: 0,
          data: [],
        };
      }

      // Use the interval from input
      const bucketSize = input.interval;

      // Group events by time bucket
      const bucketMap = new Map<string, { total: number; conversions: number }>();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (const event of events) {
        const date = new Date(event.createdAt);
        let bucketKey: string;
        
        if (bucketSize === '15min') {
          // Format: "Dec 30 14:15" (group by 15-min blocks: 00, 15, 30, 45)
          const minuteBlock = Math.floor(date.getMinutes() / 15) * 15;
          const formattedMinute = minuteBlock.toString().padStart(2, '0');
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getHours()}:${formattedMinute}`;
        } else if (bucketSize === '30min') {
          // Format: "Dec 30 14:30" (group by 30-min blocks: 00, 30)
          const minuteBlock = Math.floor(date.getMinutes() / 30) * 30;
          const formattedMinute = minuteBlock.toString().padStart(2, '0');
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getHours()}:${formattedMinute}`;
        } else if (bucketSize === 'hour') {
          // Format: "Dec 30 14:00"
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getHours()}:00`;
        } else if (bucketSize === '4hour') {
          // Format: "Dec 30 12:00" (group by 4-hour blocks: 0, 4, 8, 12, 16, 20)
          const hourBlock = Math.floor(date.getHours() / 4) * 4;
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()} ${hourBlock}:00`;
        } else {
          // Format: "Dec 30"
          bucketKey = `${monthNames[date.getMonth()]} ${date.getDate()}`;
        }

        if (!bucketMap.has(bucketKey)) {
          bucketMap.set(bucketKey, { total: 0, conversions: 0 });
        }
        
        const bucket = bucketMap.get(bucketKey)!;
        bucket.total += 1;
        if (event.isConversion) {
          bucket.conversions += 1;
        }
      }

      // Format data for chart
      const chartData = Array.from(bucketMap.entries()).map(([date, counts]) => ({
        date,
        events: counts.total,
        conversions: counts.conversions,
      }));

      // Calculate totals
      const totalEvents = events.length;
      const totalConversions = events.filter(e => e.isConversion).length;

      return {
        totalEvents,
        totalConversions,
        data: chartData,
      };
    }),
});
