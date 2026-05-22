import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  CRM_PAGE_SIZE,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";
import { NodeType } from "@/db/enums";

import { db } from "@/db";
import {
  automationEvent,
  checkIn,
  churnRiskScore,
  client as clientTable,
  clientAssignee,
  clientInstructor,
  instructor,
  introOfferRedemption,
  locationMember,
  referral,
  studioBooking,
  studioClass,
  studioMembership,
  studioPayment,
  waiverSignature,
  waiverTemplate,
} from "@/db/schema";
import { getUsersActivityStatus } from "@/lib/activity-tracker";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { createNotification } from "@/lib/notifications";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { ActivityAction } from "@/db/enums";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import {
  and,
  arrayOverlaps,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  max,
  min,
  or,
  type SQL,
} from "drizzle-orm";

const lifecycleQueryInput = z.object({
  id: z.string().min(1),
});

type ClientResult = NonNullable<
  Awaited<ReturnType<typeof getClientWithRelations>>
>;

const mapClient = (
  client: ClientResult,
  activityStatus?: Map<
    string,
    {
      isOnline: boolean;
      lastActivityAt: Date | null;
      lastLoginAt: Date;
      status: string;
      statusMessage: string | null;
    }
  >
) => {
  return {
    id: client.id,
    name: client.name,
    logo: client.logo,
    companyName: client.companyName,
    email: client.email,
    position: client.position,
    phone: client.phone,
    country: client.country,
    city: client.city,
    score: client.score ?? 0,
    type: client.type,
    source: client.source,
    lifecycleStage: client.lifecycleStage,
    website: client.website,
    linkedin: client.linkedin,
    lastInteractionAt: client.lastInteractionAt,
    tags: client.tags,
    metadata: client.metadata,
    acquisitionStage: client.acquisitionStage,
    acquiredAt: client.acquiredAt,
    trialStartedAt: client.trialStartedAt,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    emergencyContactName: client.emergencyContactName,
    emergencyContactPhone: client.emergencyContactPhone,
    fitnessGoals: client.fitnessGoals ? client.fitnessGoals.split(",").filter(Boolean) : [],
    healthNotes: client.healthNotes,
    contraindications: client.contraindications,
    birthMonth: client.birthMonth,
    birthDay: client.birthDay,
    trustedMember: client.trustedMember,
    attendanceCount: client.attendanceCount,
    currentStreak: client.currentStreak,
    assignees: client.clientAssignees.map((assignee) => {
      const userId = assignee.locationMember.user?.id;
      const activity =
        userId && activityStatus ? activityStatus.get(userId) : undefined;

      return {
        id: assignee.locationMemberId,
        userId: userId ?? null,
        name: assignee.locationMember.user?.name ?? "Unknown",
        email: assignee.locationMember.user?.email ?? null,
        image: assignee.locationMember.user?.image ?? null,
        role: assignee.locationMember.role,
        isOnline: activity?.isOnline ?? false,
        lastActivityAt: activity?.lastActivityAt ?? null,
        lastLoginAt: activity?.lastLoginAt ?? null,
        status: activity?.status ?? "OFFLINE",
        statusMessage: activity?.statusMessage ?? null,
      };
    }),
    instructors: client.clientInstructors.map((ci) => ({
      id: ci.instructor.id,
      name: ci.instructor.name,
      email: ci.instructor.email,
      image: ci.instructor.profilePhoto,
      role: ci.instructor.role,
    })),
  };
};

async function getClientWithRelations(id: string) {
  return db.query.client.findFirst({
    where: eq(clientTable.id, id),
    with: {
      clientAssignees: {
        with: {
          locationMember: {
            with: {
              user: true,
            },
          },
        },
      },
      clientInstructors: {
        with: {
          instructor: {
            columns: {
              id: true,
              name: true,
              email: true,
              profilePhoto: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

function applyLocationScope(
  conditions: SQL[],
  column: typeof clientTable.locationId,
  locationId: string | null,
  includeAllClients?: boolean,
) {
  if (includeAllClients) {
    return;
  }

  conditions.push(locationId ? eq(column, locationId) : isNull(column));
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export const clientsRouter = createTRPCRouter({
  getLocationMembers: protectedProcedure.query(async ({ ctx }) => {
    const locationId = ctx.locationId;
    if (!locationId) {
      return [];
    }

    const members = await db.query.locationMember.findMany({
      where: eq(locationMember.locationId, locationId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: asc(locationMember.createdAt),
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.user?.id ?? null,
      name: member.user?.name ?? "Unknown",
      email: member.user?.email ?? null,
      image: member.user?.image ?? null,
      role: member.role,
    }));
  }),

  getInstructors: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      return [];
    }

    const instructors = await db.query.instructor.findMany({
      where: and(
        eq(instructor.organizationId, ctx.orgId),
        ctx.locationId
          ? eq(instructor.locationId, ctx.locationId)
          : isNull(instructor.locationId),
        eq(instructor.isActive, true)
      ),
      columns: {
        id: true,
        name: true,
        email: true,
        profilePhoto: true,
        role: true,
      },
      orderBy: asc(instructor.name),
    });

    return instructors.map((w) => ({
      id: w.id,
      name: w.name,
      email: w.email,
      image: w.profilePhoto,
      role: w.role,
    }));
  }),

  count: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      return 0;
    }

    const [result] = await db
      .select({ total: count() })
      .from(clientTable)
      .where(
        and(
          eq(clientTable.organizationId, orgId),
          locationId ? eq(clientTable.locationId, locationId) : undefined
        )
      );

    return result?.total ?? 0;
  }),

  dateRange: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId;

    if (!orgId) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { minDate: thirtyDaysAgo, maxDate: now };
    }

    const [result] = await db
      .select({
        minCreatedAt: min(clientTable.createdAt),
        minLastInteractionAt: min(clientTable.lastInteractionAt),
        minUpdatedAt: min(clientTable.updatedAt),
        maxCreatedAt: max(clientTable.createdAt),
        maxLastInteractionAt: max(clientTable.lastInteractionAt),
        maxUpdatedAt: max(clientTable.updatedAt),
      })
      .from(clientTable)
      .where(
        and(
          eq(clientTable.organizationId, orgId),
          locationId ? eq(clientTable.locationId, locationId) : undefined
        )
      );

    // Find the earliest and latest dates across all fields
    const allDates = [
      result?.minCreatedAt,
      result?.minLastInteractionAt,
      result?.minUpdatedAt,
      result?.maxCreatedAt,
      result?.maxLastInteractionAt,
      result?.maxUpdatedAt,
    ].filter((d): d is Date => d !== null);

    if (allDates.length === 0) {
      // No clients yet, return default range
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        minDate: thirtyDaysAgo,
        maxDate: now,
      };
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    return {
      minDate,
      maxDate,
    };
  }),

  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(20),
          search: z.string().optional(),
          types: z.array(z.enum(CLIENT_TYPE_VALUES)).optional(),
          tags: z.array(z.string()).optional(),
          assignedTo: z.array(z.string()).optional(),
          createdAtStart: z.date().optional(),
          createdAtEnd: z.date().optional(),
          lastActivityStart: z.date().optional(),
          lastActivityEnd: z.date().optional(),
          updatedAtStart: z.date().optional(),
          updatedAtEnd: z.date().optional(),
          cursor: z.number().optional(),
          limit: z.number().optional(),
          locationId: z.string().optional(), // Override for "all-clients" view
          includeAllClients: z.boolean().optional(), // Flag to include all clients
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      // Use input locationId if provided, otherwise use context locationId
      const locationId = input?.locationId !== undefined
        ? (input.locationId || null)
        : ctx.locationId;

      if (!orgId) {
        return {
          items: [],
          nextCursor: null,
          total: 0,
          pagination: {
            currentPage: 1,
            totalPages: 0,
            pageSize: input?.pageSize ?? 20,
            totalItems: 0,
          },
        };
      }

      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const take = Math.min(input?.limit ?? CRM_PAGE_SIZE, CRM_PAGE_SIZE);
      const skip = input?.cursor ?? (page - 1) * pageSize;

      const conditions: SQL[] = [eq(clientTable.organizationId, orgId)];
      applyLocationScope(
        conditions,
        clientTable.locationId,
        locationId,
        input?.includeAllClients
      );

      if (input?.types && input.types.length > 0) {
        conditions.push(inArray(clientTable.type, input.types));
      }

      if (input?.tags && input.tags.length > 0) {
        conditions.push(arrayOverlaps(clientTable.tags, input.tags));
      }

      if (input?.assignedTo && input.assignedTo.length > 0) {
        conditions.push(
          exists(
            db
              .select({ id: clientAssignee.id })
              .from(clientAssignee)
              .where(
                and(
                  eq(clientAssignee.clientId, clientTable.id),
                  inArray(clientAssignee.locationMemberId, input.assignedTo)
                )
              )
          )
        );
      }

      if (input?.createdAtStart || input?.createdAtEnd) {
        if (input.createdAtStart) {
          conditions.push(gte(clientTable.createdAt, input.createdAtStart));
        }
        if (input.createdAtEnd) {
          conditions.push(lte(clientTable.createdAt, endOfDay(input.createdAtEnd)));
        }
      }

      if (input?.lastActivityStart || input?.lastActivityEnd) {
        if (input.lastActivityStart) {
          conditions.push(gte(clientTable.lastInteractionAt, input.lastActivityStart));
        }
        if (input.lastActivityEnd) {
          conditions.push(
            lte(clientTable.lastInteractionAt, endOfDay(input.lastActivityEnd))
          );
        }
      }

      if (input?.updatedAtStart || input?.updatedAtEnd) {
        if (input.updatedAtStart) {
          conditions.push(gte(clientTable.updatedAt, input.updatedAtStart));
        }
        if (input.updatedAtEnd) {
          conditions.push(lte(clientTable.updatedAt, endOfDay(input.updatedAtEnd)));
        }
      }

      if (input?.search?.trim()) {
        const search = input.search.trim();
        const pattern = `%${search}%`;
        conditions.push(
          or(
            ilike(clientTable.name, pattern),
            ilike(clientTable.companyName, pattern),
            ilike(clientTable.email, pattern),
            ilike(clientTable.phone, pattern),
            ilike(clientTable.country, pattern),
            ilike(clientTable.position, pattern)
          )!
        );
      }

      const where = and(...conditions);
      const [items, totalResult] = await Promise.all([
        db.query.client.findMany({
          where,
          with: {
            clientAssignees: {
              with: {
                locationMember: {
                  with: {
                    user: true,
                  },
                },
              },
            },
            clientInstructors: {
              with: {
                instructor: {
                  columns: {
                    id: true,
                    name: true,
                    email: true,
                    profilePhoto: true,
                    role: true,
                  },
                },
              },
            },
          },
          orderBy: [desc(clientTable.updatedAt), desc(clientTable.createdAt)],
          offset: skip,
          limit: pageSize,
        }),
        db.select({ total: count() }).from(clientTable).where(where),
      ]);
      const totalItems = totalResult[0]?.total ?? 0;

      // Collect all unique user IDs from assignees
      const userIds = new Set<string>();
      for (const client of items) {
        for (const assignee of client.clientAssignees) {
          const userId = assignee.locationMember.user?.id;
          if (userId) {
            userIds.add(userId);
          }
        }
      }

      // Fetch activity status for all users
      const activityStatus =
        userIds.size > 0
          ? await getUsersActivityStatus(Array.from(userIds))
          : new Map();

      const nextCursor = skip + items.length < totalItems ? skip + take : null;
      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        items: items.map((client) => mapClient(client, activityStatus)),
        nextCursor,
        total: totalItems,
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalItems,
        },
      };
    }),

  memberLifecycle: protectedProcedure
    .input(lifecycleQueryInput)
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required",
        });
      }

      const client = await db.query.client.findFirst({
        where: and(
          eq(clientTable.id, input.id),
          eq(clientTable.organizationId, orgId),
          locationId ? eq(clientTable.locationId, locationId) : undefined
        ),
        columns: {
          id: true,
          name: true,
          type: true,
          lifecycleStage: true,
          acquisitionStage: true,
          source: true,
          tags: true,
          birthMonth: true,
          birthDay: true,
          waiverSignedAt: true,
          attendanceCount: true,
          currentStreak: true,
          acquiredAt: true,
          trialStartedAt: true,
          createdAt: true,
        },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      const now = new Date();

      const empty = () => [] as never[];
      const [
        memberships,
        payments,
        upcomingBookings,
        recentBookings,
        checkIns,
        requiredWaivers,
        waiverSignatures,
        introRedemptions,
        referralsMade,
        referralsReceived,
        automationEvents,
        churnRisk,
      ] = await Promise.all([
        db.query.studioMembership.findMany({
          where: and(
            eq(studioMembership.clientId, input.id),
            eq(studioMembership.organizationId, orgId),
            locationId ? eq(studioMembership.locationId, locationId) : undefined
          ),
          columns: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            renewalDate: true,
            autoRenew: true,
          },
          with: {
            membershipPlan: {
              columns: {
                id: true,
                name: true,
                price: true,
                billingInterval: true,
              },
            },
          },
          orderBy: [asc(studioMembership.status), desc(studioMembership.startDate)],
          limit: 5,
        }).catch(empty),
        db.query.studioPayment.findMany({
          where: and(
            eq(studioPayment.clientId, input.id),
            eq(studioPayment.organizationId, orgId),
            locationId ? eq(studioPayment.locationId, locationId) : undefined,
            isNull(studioPayment.deletedAt)
          ),
          columns: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            type: true,
            description: true,
            createdAt: true,
          },
          orderBy: desc(studioPayment.createdAt),
          limit: 8,
        }).catch(empty),
        db.query.studioBooking.findMany({
          where: and(
            eq(studioBooking.clientId, input.id),
            eq(studioBooking.status, "BOOKED"),
            exists(
              db
                .select({ id: studioClass.id })
                .from(studioClass)
                .where(
                  and(
                    eq(studioClass.id, studioBooking.classId),
                    eq(studioClass.organizationId, orgId),
                    locationId ? eq(studioClass.locationId, locationId) : undefined,
                    gte(studioClass.startTime, now)
                  )
                )
            )
          ),
          columns: {
            id: true,
            status: true,
            bookedAt: true,
          },
          with: {
            studioClass: {
              columns: {
                id: true,
                name: true,
                startTime: true,
                endTime: true,
              },
              with: {
                classType: { columns: { name: true, color: true } },
                instructor: { columns: { name: true } },
              },
            },
          },
          limit: 20,
        }).catch(empty),
        db.query.studioBooking.findMany({
          where: and(
            eq(studioBooking.clientId, input.id),
            exists(
              db
                .select({ id: studioClass.id })
                .from(studioClass)
                .where(
                  and(
                    eq(studioClass.id, studioBooking.classId),
                    eq(studioClass.organizationId, orgId),
                    locationId ? eq(studioClass.locationId, locationId) : undefined,
                    lt(studioClass.startTime, now)
                  )
                )
            )
          ),
          columns: {
            id: true,
            status: true,
            checkedInAt: true,
            cancelledAt: true,
          },
          with: {
            studioClass: {
              columns: {
                name: true,
                startTime: true,
              },
              with: {
                classType: { columns: { name: true, color: true } },
              },
            },
          },
          limit: 20,
        }).catch(empty),
        db.query.checkIn.findMany({
          where: and(
            eq(checkIn.clientId, input.id),
            eq(checkIn.organizationId, orgId),
            locationId ? eq(checkIn.locationId, locationId) : undefined
          ),
          columns: {
            id: true,
            checkedInAt: true,
            isLateArrival: true,
          },
          with: {
            studioClass: {
              columns: { name: true },
              with: {
                classType: { columns: { name: true, color: true } },
              },
            },
          },
          orderBy: desc(checkIn.checkedInAt),
          limit: 6,
        }).catch(empty),
        db.query.waiverTemplate.findMany({
          where: and(
            eq(waiverTemplate.organizationId, orgId),
            locationId ? eq(waiverTemplate.locationId, locationId) : undefined,
            eq(waiverTemplate.isActive, true),
            eq(waiverTemplate.isRequired, true)
          ),
          columns: { id: true, name: true, version: true },
          orderBy: desc(waiverTemplate.createdAt),
        }).catch(empty),
        db.query.waiverSignature.findMany({
          where: eq(waiverSignature.clientId, input.id),
          columns: {
            id: true,
            templateId: true,
            signedAt: true,
            expiresAt: true,
          },
          with: {
            waiverTemplate: { columns: { name: true, version: true } },
          },
          orderBy: desc(waiverSignature.signedAt),
        }).catch(empty),
        db.query.introOfferRedemption.findMany({
          where: eq(introOfferRedemption.clientId, input.id),
          columns: {
            id: true,
            status: true,
            redeemedAt: true,
            expiresAt: true,
            classesUsed: true,
            convertedAt: true,
          },
          with: {
            introOffer: {
              columns: {
                name: true,
                classCredits: true,
                durationDays: true,
                price: true,
                currency: true,
              },
            },
          },
          orderBy: desc(introOfferRedemption.redeemedAt),
          limit: 5,
        }).catch(empty),
        db.query.referral.findMany({
          where: eq(referral.referrerClientId, input.id),
          columns: {
            id: true,
            code: true,
            status: true,
            refereeEmail: true,
            convertedAt: true,
            createdAt: true,
          },
          orderBy: desc(referral.createdAt),
          limit: 5,
        }).catch(empty),
        db.query.referral.findMany({
          where: eq(referral.refereeClientId, input.id),
          columns: {
            id: true,
            code: true,
            status: true,
            convertedAt: true,
            createdAt: true,
          },
          with: {
            client_referrerClientId: { columns: { name: true } },
          },
          orderBy: desc(referral.createdAt),
          limit: 3,
        }).catch(empty),
        db.query.automationEvent.findMany({
          where: and(
            eq(automationEvent.clientId, input.id),
            eq(automationEvent.organizationId, orgId),
            locationId ? eq(automationEvent.locationId, locationId) : undefined
          ),
          columns: {
            id: true,
            type: true,
            name: true,
            value: true,
            occurredAt: true,
          },
          with: {
            workflow: { columns: { name: true } },
          },
          orderBy: desc(automationEvent.occurredAt),
          limit: 10,
        }).catch(empty),
        db.query.churnRiskScore.findFirst({
          where: and(
            eq(churnRiskScore.organizationId, orgId),
            eq(churnRiskScore.clientId, input.id)
          ),
          columns: {
            score: true,
            riskLevel: true,
            calculatedAt: true,
            suggestedActions: true,
          },
        }).catch(() => undefined),
      ]);

      const signedRequiredTemplateIds = new Set(
        waiverSignatures
          .filter((signature) => !signature.expiresAt || signature.expiresAt > now)
          .map((signature) => signature.templateId),
      );
      const missingWaivers = requiredWaivers.filter(
        (template) => !signedRequiredTemplateIds.has(template.id),
      );
      const failedPayments = payments.filter((payment) => payment.status === "FAILED");
      const pendingPayments = payments.filter((payment) => payment.status === "PENDING");
      const activeMembership = memberships.find(
        (membership) => membership.status === "ACTIVE",
      );
      const latestIntroOffer = introRedemptions[0] ?? null;
      const lastVisit = checkIns[0]?.checkedInAt ?? null;

      return {
        client,
        summary: {
          lifecycleStage: client.lifecycleStage,
          acquisitionStage: client.acquisitionStage,
          source: client.source,
          tags: client.tags,
          birthday:
            client.birthMonth && client.birthDay
              ? `${String(client.birthMonth).padStart(2, "0")}/${String(client.birthDay).padStart(2, "0")}`
              : null,
          visitCount: Math.max(client.attendanceCount, checkIns.length),
          currentStreak: client.currentStreak,
          lastVisit,
          nextBooking: upcomingBookings[0] ?? null,
          membershipStatus: activeMembership?.status ?? memberships[0]?.status ?? "NONE",
          introOfferStatus: latestIntroOffer?.status ?? "NONE",
          referralCode: referralsMade[0]?.code ?? null,
          waiverStatus:
            requiredWaivers.length === 0
              ? "NOT_REQUIRED"
              : missingWaivers.length === 0
                ? "SIGNED"
                : "MISSING",
          paymentStatus:
            failedPayments.length > 0
              ? "FAILED"
              : pendingPayments.length > 0
                ? "PENDING"
                : payments.length > 0
                  ? "CURRENT"
                  : "NO_PAYMENTS",
          churnRisk,
        },
        funnel: {
          leadCaptured: true,
          introPurchased: introRedemptions.length > 0,
          firstClassBooked:
            upcomingBookings.length > 0 || recentBookings.length > 0,
          firstClassAttended: checkIns.length > 0,
          membershipPurchased: memberships.length > 0,
          nextClassBooked: upcomingBookings.length > 0,
          inactiveWinback:
            client.type === "CHURN" ||
            memberships.some((membership) =>
              ["CANCELLED", "EXPIRED", "INACTIVE"].includes(membership.status),
            ),
        },
        memberships: memberships.map((membership) => ({
          ...membership,
          plan: membership.membershipPlan
            ? {
                ...membership.membershipPlan,
                price: membership.membershipPlan.price.toString(),
              }
            : null,
          membershipPlan: undefined,
        })),
        payments: payments.map((payment) => ({
          ...payment,
          amount: payment.amount.toString(),
        })),
        upcomingBookings: [...upcomingBookings]
          .sort(
            (a, b) =>
              a.studioClass.startTime.getTime() - b.studioClass.startTime.getTime()
          )
          .slice(0, 5),
        recentBookings: [...recentBookings]
          .sort(
            (a, b) =>
              b.studioClass.startTime.getTime() - a.studioClass.startTime.getTime()
          )
          .slice(0, 6),
        checkIns,
        waivers: {
          required: requiredWaivers,
          signatures: waiverSignatures.map((signature) => ({
            ...signature,
            template: signature.waiverTemplate,
            waiverTemplate: undefined,
          })),
          missing: missingWaivers,
        },
        introOffers: introRedemptions.map((redemption) => ({
          ...redemption,
          introOffer: undefined,
          offer: {
            ...redemption.introOffer,
            price: redemption.introOffer.price.toString(),
          },
        })),
        referrals: {
          made: referralsMade,
          received: referralsReceived.map((referral) => ({
            ...referral,
            referrerClient: referral.client_referrerClientId,
            client_referrerClientId: undefined,
          })),
        },
        automationEvents: automationEvents.map((event) => ({
          ...event,
          value: event.value?.toString() ?? null,
        })),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        logo: z.string().optional(),
        companyName: z.string().optional(),
        email: z
          .string()
          .email({ message: "Invalid email" })
          .optional()
          .or(z.literal("")),
        position: z.string().optional(),
        phone: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        score: z.number().optional(),
        type: z.enum(CLIENT_TYPE_VALUES).optional(),
        lifecycleStage: z.enum(LIFECYCLE_STAGE_VALUES).optional(),
        acquisitionStage: z.enum(ACQUISITION_STAGE_VALUES).optional(),
        source: z.string().optional(),
        website: z.string().optional(),
        linkedin: z.string().optional(),
        tags: z.array(z.string()).optional(),
        birthMonth: z.number().int().min(1).max(12).optional(),
        birthDay: z.number().int().min(1).max(31).optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        healthNotes: z.string().optional(),
        contraindications: z.string().optional(),
        trustedMember: z.boolean().optional(),
        instructorIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to create clients",
        });
      }

      const clientId = crypto.randomUUID();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(clientTable).values({
          id: clientId,
          organizationId: orgId,
          locationId: locationId ?? null,
          name: input.name,
          logo: input.logo,
          companyName: input.companyName,
          email: input.email || null,
          position: input.position,
          phone: input.phone,
          country: input.country,
          city: input.city,
          score: input.score ?? 0,
          type: input.type ?? "LEAD",
          lifecycleStage: input.lifecycleStage,
          acquisitionStage: input.acquisitionStage ?? "INQUIRY",
          ...(input.acquisitionStage === "TRIAL" && {
            trialStartedAt: new Date(),
          }),
          ...(input.acquisitionStage === "ACTIVE" && {
            acquiredAt: new Date(),
          }),
          source: input.source,
          website: input.website,
          linkedin: input.linkedin,
          tags: input.tags ?? [],
          birthMonth: input.birthMonth,
          birthDay: input.birthDay,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
          healthNotes: input.healthNotes,
          contraindications: input.contraindications,
          trustedMember: input.trustedMember ?? false,
          createdAt: now,
          updatedAt: now,
        });

        if (input.instructorIds && input.instructorIds.length > 0) {
          await tx.insert(clientInstructor).values(
            input.instructorIds.map((instructorId) => ({
              id: crypto.randomUUID(),
              clientId,
              instructorId,
            }))
          );
        }
      });

      const client = await getClientWithRelations(clientId);

      if (!client) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Client was created but could not be loaded.",
        });
      }

      // Send notification
      await createNotification({
        type: "CLIENT_CREATED",
        title: "Member created",
        message: `${ctx.auth.user.name} added a new member: ${client.name}`,
        actorId: ctx.auth.user.id,
        entityType: "client",
        entityId: client.id,
        organizationId: orgId,
        locationId: locationId ?? undefined,
      });

      // Log activity and PostHog analytics
      await logAnalytics({
        organizationId: orgId,
        locationId: locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "client",
        entityId: client.id,
        entityName: client.name,
        metadata: {
          email: client.email,
          companyName: client.companyName,
          type: client.type,
        },
        posthogProperties: {
          email: client.email,
          company_name: client.companyName,
          client_type: client.type,
          lifecycle_stage: client.lifecycleStage,
          score: client.score,
        },
      });

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.CLIENT_CREATED_TRIGGER,
        organizationId: orgId,
        locationId,
        triggerData: {
          client: toClientWorkflowPayload(client),
        },
      });

      return mapClient(client);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required").optional(),
        logo: z.string().optional(),
        companyName: z.string().optional(),
        email: z
          .string()
          .email({ message: "Invalid email" })
          .optional()
          .or(z.literal("")),
        position: z.string().optional(),
        phone: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        score: z.number().optional(),
        type: z.enum(CLIENT_TYPE_VALUES).optional(),
        lifecycleStage: z.enum(LIFECYCLE_STAGE_VALUES).optional(),
        acquisitionStage: z.enum(ACQUISITION_STAGE_VALUES).optional(),
        source: z.string().optional(),
        website: z.string().optional(),
        linkedin: z.string().optional(),
        tags: z.array(z.string()).optional(),
        assigneeIds: z.array(z.string()).optional(),
        instructorIds: z.array(z.string()).optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        fitnessGoals: z.array(z.string()).optional(),
        healthNotes: z.string().optional(),
        contraindications: z.string().optional(),
        birthMonth: z.number().int().min(1).max(12).optional(),
        birthDay: z.number().int().min(1).max(31).optional(),
        trustedMember: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.orgId;
      const locationId = ctx.locationId;

      if (!orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization context required to update clients",
        });
      }

      const { id, assigneeIds, instructorIds, ...data } = input;

      // Fetch old client data for change tracking
      const oldClient = await db.query.client.findFirst({
        where: and(
          eq(clientTable.id, id),
          eq(clientTable.organizationId, orgId),
          locationId ? eq(clientTable.locationId, locationId) : undefined
        ),
        columns: {
          name: true,
          email: true,
          companyName: true,
          type: true,
          lifecycleStage: true,
          score: true,
          phone: true,
          position: true,
          source: true,
          website: true,
          linkedin: true,
          tags: true,
          acquisitionStage: true,
          birthMonth: true,
          birthDay: true,
        },
      });

      if (!oldClient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Validate assigneeIds belong to the same location (only if in location context)
      if (assigneeIds && assigneeIds.length > 0 && locationId) {
        const validMembers = await db.query.locationMember.findMany({
          where: and(
            inArray(locationMember.id, assigneeIds),
            eq(locationMember.locationId, locationId)
          ),
          columns: { id: true },
        });

        const validMemberIds = validMembers.map((m) => m.id);
        const invalidIds = assigneeIds.filter(
          (id) => !validMemberIds.includes(id)
        );

        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid member IDs: ${invalidIds.join(", ")}`,
          });
        }
      }

      const updateData: Partial<typeof clientTable.$inferInsert> = {
        updatedAt: new Date(),
        ...(data.name && { name: data.name }),
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.companyName !== undefined && {
          companyName: data.companyName || null,
        }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.position !== undefined && {
          position: data.position || null,
        }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.country !== undefined && { country: data.country || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.score !== undefined && { score: data.score }),
        ...(data.type && { type: data.type }),
        ...(data.lifecycleStage !== undefined && {
          lifecycleStage: data.lifecycleStage || null,
        }),
        ...(data.acquisitionStage !== undefined && {
          acquisitionStage: data.acquisitionStage,
        }),
        ...(data.acquisitionStage === "TRIAL" && {
          trialStartedAt: new Date(),
        }),
        ...(data.acquisitionStage === "ACTIVE" && {
          acquiredAt: new Date(),
        }),
        ...(data.source !== undefined && { source: data.source || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.linkedin !== undefined && {
          linkedin: data.linkedin || null,
        }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.emergencyContactName !== undefined && {
          emergencyContactName: data.emergencyContactName || null,
        }),
        ...(data.emergencyContactPhone !== undefined && {
          emergencyContactPhone: data.emergencyContactPhone || null,
        }),
        ...(data.fitnessGoals !== undefined && {
          fitnessGoals: data.fitnessGoals?.join(",") || null,
        }),
        ...(data.healthNotes !== undefined && {
          healthNotes: data.healthNotes || null,
        }),
        ...(data.contraindications !== undefined && {
          contraindications: data.contraindications || null,
        }),
        ...(data.birthMonth !== undefined && { birthMonth: data.birthMonth }),
        ...(data.birthDay !== undefined && { birthDay: data.birthDay }),
        ...(data.trustedMember !== undefined && {
          trustedMember: data.trustedMember,
        }),
      };

      await db.transaction(async (tx) => {
        const [updatedClient] = await tx
          .update(clientTable)
          .set(updateData)
          .where(
            and(
              eq(clientTable.id, id),
              eq(clientTable.organizationId, orgId),
              locationId ? eq(clientTable.locationId, locationId) : undefined
            )
          )
          .returning({ id: clientTable.id });

        if (!updatedClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        if (assigneeIds !== undefined) {
          await tx.delete(clientAssignee).where(eq(clientAssignee.clientId, id));

          if (assigneeIds.length > 0) {
            await tx.insert(clientAssignee).values(
              assigneeIds.map((locationMemberId) => ({
                id: crypto.randomUUID(),
                clientId: id,
                locationMemberId,
              }))
            );
          }
        }

        if (instructorIds !== undefined) {
          await tx
            .delete(clientInstructor)
            .where(eq(clientInstructor.clientId, id));

          if (instructorIds.length > 0) {
            await tx.insert(clientInstructor).values(
              instructorIds.map((instructorId) => ({
                id: crypto.randomUUID(),
                clientId: id,
                instructorId,
              }))
            );
          }
        }
      });

      const client = await getClientWithRelations(id);

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client not found",
        });
      }

      // Log activity with changes
      const changes = getChangedFields(oldClient, data);
      const isLifecycleChange = data.lifecycleStage !== undefined &&
        data.lifecycleStage !== oldClient.lifecycleStage;

      if (changes) {
        await createNotification({
          type: "CLIENT_UPDATED",
          title: "Member updated",
          message: `${ctx.auth.user.name} updated member ${client.name}`,
          actorId: ctx.auth.user.id,
          entityType: "client",
          entityId: client.id,
          organizationId: orgId,
          locationId: locationId ?? undefined,
          data: {
            fieldsChanged: Object.keys(changes),
          },
        });
      }

      await logAnalytics({
        organizationId: orgId,
        locationId: locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "client",
        entityId: client.id,
        entityName: client.name,
        changes,
        metadata: {
          fieldsChanged: changes ? Object.keys(changes) : [],
          isLifecycleChange,
          ...(isLifecycleChange && {
            oldLifecycleStage: oldClient.lifecycleStage,
            newLifecycleStage: data.lifecycleStage,
          }),
        },
        posthogProperties: {
          fields_changed: changes ? Object.keys(changes) : [],
          is_lifecycle_change: isLifecycleChange,
          ...(isLifecycleChange && {
            old_lifecycle_stage: oldClient.lifecycleStage,
            new_lifecycle_stage: data.lifecycleStage,
          }),
          lifecycle_stage: client.lifecycleStage,
          score: client.score,
        },
      });

      const changedFields = changes ? Object.keys(changes) : [];
      const previousClientPayload = toPartialClientWorkflowPayload(oldClient);
      const currentClientPayload = toClientWorkflowPayload(client);

      if (changedFields.length > 0) {
        await triggerWorkflowsForNodeType({
          nodeType: NodeType.CLIENT_UPDATED_TRIGGER,
          organizationId: orgId,
          locationId,
          triggerData: {
            client: currentClientPayload,
            previousClient: previousClientPayload,
            changes,
            fieldsChanged: changedFields,
          },
          shouldTriggerNode: (node) => {
            const watchFields = getStringArrayFromJson(node.data, "watchFields");

            if (watchFields.length === 0) {
              return true;
            }

            return watchFields.some((fieldName) =>
              changedFields.includes(fieldName),
            );
          },
        });

        await Promise.all(
          changedFields.map((fieldName) =>
            triggerWorkflowsForNodeType({
              nodeType: NodeType.CLIENT_FIELD_CHANGED_TRIGGER,
              organizationId: orgId,
              locationId,
              triggerData: {
                client: currentClientPayload,
                fieldName,
                oldValue: previousClientPayload[fieldName],
                newValue: currentClientPayload[fieldName],
              },
              shouldTriggerNode: (node) =>
                getStringFromJson(node.data, "fieldName") === fieldName,
            }),
          ),
        );
      }

      if (data.tags !== undefined) {
        const oldTags = oldClient.tags ?? [];
        const newTags = client.tags ?? [];
        const previousTags = new Set(oldTags);
        const currentTags = new Set(newTags);
        const addedTags = newTags.filter((tag) => !previousTags.has(tag));
        const removedTags = oldTags.filter((tag) => !currentTags.has(tag));

        const tagTriggerPayload = {
          client: currentClientPayload,
          previousTags: oldTags,
          currentTags: newTags,
        };

        await Promise.all([
          ...addedTags.map((tag) =>
            triggerWorkflowsForNodeType({
              nodeType: NodeType.CLIENT_TAG_ADDED_TRIGGER,
              organizationId: orgId,
              locationId,
              triggerData: {
                ...tagTriggerPayload,
                tag,
              },
              shouldTriggerNode: (node) => {
                const configuredTag = getStringFromJson(node.data, "tag");
                return !configuredTag || configuredTag === tag;
              },
            }),
          ),
          ...removedTags.map((tag) =>
            triggerWorkflowsForNodeType({
              nodeType: NodeType.CLIENT_TAG_REMOVED_TRIGGER,
              organizationId: orgId,
              locationId,
              triggerData: {
                ...tagTriggerPayload,
                tag,
              },
              shouldTriggerNode: (node) => {
                const configuredTag = getStringFromJson(node.data, "tag");
                return !configuredTag || configuredTag === tag;
              },
            }),
          ),
        ]);
      }

      return mapClient(client);
    }),
});

function toClientWorkflowPayload(client: ClientResult): Record<string, unknown> {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    companyName: client.companyName,
    position: client.position,
    type: client.type,
    lifecycleStage: client.lifecycleStage,
    acquisitionStage: client.acquisitionStage,
    source: client.source,
    website: client.website,
    linkedin: client.linkedin,
    tags: client.tags,
    birthMonth: client.birthMonth,
    birthDay: client.birthDay,
    attendanceCount: client.attendanceCount,
    currentStreak: client.currentStreak,
    acquiredAt: client.acquiredAt?.toISOString() ?? null,
    trialStartedAt: client.trialStartedAt?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

function toPartialClientWorkflowPayload(
  client: Record<string, unknown>,
): Record<string, unknown> {
  return { ...client };
}

function getStringFromJson(
  value: unknown,
  key: string,
): string | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const nested = value[key];
  return typeof nested === "string" ? nested : undefined;
}

function getStringArrayFromJson(
  value: unknown,
  key: string,
): string[] {
  if (!isJsonObject(value)) {
    return [];
  }

  const nested = value[key];

  if (!Array.isArray(nested)) {
    return [];
  }

  return nested.filter((item): item is string => typeof item === "string");
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
