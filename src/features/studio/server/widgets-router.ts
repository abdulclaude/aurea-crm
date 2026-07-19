import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { WidgetType } from "@/db/enums";
import {
  bookingEventType,
  calComCredential,
  instructor,
  pricingOption,
  publicationTarget,
  publicationVersion,
  widgetConfig,
} from "@/db/schema";
import {
  publicationManageProcedure,
  publicationViewProcedure,
} from "@/features/permissions/server/publication-procedures";
import {
  buildWidgetEmbed,
  getOrganizationSlug,
  getPublishedWidgetTarget,
  getWidgetOrThrow,
  requireWidgetScope,
  serializeWidget,
  targetScopeWhere,
  validateInstructorWidgetConfig,
  validateIntroOfferWidgetConfig,
  validateEventWidgetConfig,
  validateBookingWidgetConfig,
  validateMembershipWidgetConfig,
  validateOnDemandWidgetConfig,
  validateReferralWidgetConfig,
  validateScheduleWidgetConfig,
  widgetScopeWhere,
} from "@/features/studio/server/widget-router-support";
import { getWidgetPublicationHealth } from "@/features/studio/server/widget-publication-health";
import { getWidgetDraftPreview } from "@/features/studio/server/widget-draft-preview";
import {
  bookingWidgetConfigSchema,
  eventWidgetConfigSchema,
  instructorWidgetConfigSchema,
  introOfferWidgetConfigSchema,
  membershipWidgetConfigSchema,
  onDemandWidgetConfigSchema,
  referralWidgetConfigSchema,
  scheduleWidgetConfigSchema,
} from "@/features/studio/widgets/contracts";
import {
  selectPublicEventPrograms,
  selectPublicFreeOnDemandAssets,
  selectPublicIntroOffers,
  selectPublicReferralPrograms,
} from "@/features/publications/server/widget-source-data";
import { createTRPCRouter } from "@/trpc/init";

const createWidgetSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.BOOKING),
    config: bookingWidgetConfigSchema,
  }),
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.SCHEDULE),
    config: scheduleWidgetConfigSchema.optional(),
  }),
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.INSTRUCTORS),
    config: instructorWidgetConfigSchema,
  }),
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.MEMBERSHIP),
    config: membershipWidgetConfigSchema,
  }),
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.INTRO_OFFER),
    config: introOfferWidgetConfigSchema,
  }),
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.EVENT),
    config: eventWidgetConfigSchema,
  }),
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.ON_DEMAND),
    config: onDemandWidgetConfigSchema,
  }),
  z.object({
    name: z.string().trim().min(1).max(100),
    type: z.literal(WidgetType.REFERRAL),
    config: referralWidgetConfigSchema,
  }),
]);

const updateWidgetSchema = z.union([
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.SCHEDULE),
    config: scheduleWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.BOOKING),
    config: bookingWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.INSTRUCTORS),
    config: instructorWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.MEMBERSHIP),
    config: membershipWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.INTRO_OFFER),
    config: introOfferWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.EVENT),
    config: eventWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.ON_DEMAND),
    config: onDemandWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    type: z.literal(WidgetType.REFERRAL),
    config: referralWidgetConfigSchema,
  }),
  z.object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean(),
  }),
]);

export const widgetsRouter = createTRPCRouter({
  list: publicationViewProcedure.query(async ({ ctx }) => {
    const scope = requireWidgetScope(ctx);
    const [widgets, organizationSlug, targets] = await Promise.all([
      db
        .select()
        .from(widgetConfig)
        .where(widgetScopeWhere(scope))
        .orderBy(desc(widgetConfig.createdAt)),
      getOrganizationSlug(scope.organizationId),
      db
        .select({
          sourceId: publicationTarget.sourceId,
          slug: publicationTarget.slug,
          snapshot: publicationVersion.snapshot,
        })
        .from(publicationTarget)
        .innerJoin(
          publicationVersion,
          and(
            eq(publicationVersion.id, publicationTarget.publishedVersionId),
            eq(publicationVersion.targetId, publicationTarget.id),
          ),
        )
        .where(
          and(
            targetScopeWhere(scope),
            eq(publicationTarget.kind, "WIDGET"),
            eq(publicationTarget.status, "PUBLISHED"),
          ),
        ),
    ]);
    const targetBySourceId = new Map(
      targets.flatMap((target) =>
        target.sourceId ? [[target.sourceId, target] as const] : [],
      ),
    );
    const publicationHealth = await getWidgetPublicationHealth({
      widgets,
      targets,
      scope,
    });
    return {
      widgets: widgets.map((widget) =>
        serializeWidget({
          widget,
          target: targetBySourceId.get(widget.id) ?? null,
          organizationSlug,
          publicationCurrent: publicationHealth.get(widget.id) ?? false,
        }),
      ),
    };
  }),

  create: publicationManageProcedure
    .input(createWidgetSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const config = input.type === WidgetType.SCHEDULE
        ? await validateScheduleWidgetConfig(
            scheduleWidgetConfigSchema.parse(input.config ?? {}),
            scope,
          )
        : input.type === WidgetType.BOOKING
          ? await validateBookingWidgetConfig(input.config, scope)
          : input.type === WidgetType.INSTRUCTORS
            ? await validateInstructorWidgetConfig(input.config, scope)
            : input.type === WidgetType.INTRO_OFFER
              ? await validateIntroOfferWidgetConfig(input.config, scope)
              : input.type === WidgetType.EVENT
                ? await validateEventWidgetConfig(input.config, scope)
                : input.type === WidgetType.ON_DEMAND
                  ? await validateOnDemandWidgetConfig(input.config, scope)
                  : input.type === WidgetType.REFERRAL
                    ? await validateReferralWidgetConfig(input.config, scope)
                  : await validateMembershipWidgetConfig(input.config, scope);
      const [widget] = await db
        .insert(widgetConfig)
        .values({
          id: createId(),
          ...scope,
          name: input.name,
          type: input.type,
          config,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return { widget };
    }),

  getDraftPreview: publicationViewProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) =>
      getWidgetDraftPreview({
        id: input.id,
        scope: requireWidgetScope(ctx),
      }),
    ),

  update: publicationManageProcedure
    .input(updateWidgetSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const existing = await getWidgetOrThrow(input.id, scope);
      if ("type" in input && existing.type !== input.type) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Widget settings do not match this widget type.",
        });
      }
      const config =
        "type" in input
          ? input.type === WidgetType.SCHEDULE
            ? await validateScheduleWidgetConfig(input.config, scope)
            : input.type === WidgetType.BOOKING
              ? await validateBookingWidgetConfig(input.config, scope)
              : input.type === WidgetType.INSTRUCTORS
                ? await validateInstructorWidgetConfig(input.config, scope)
                : input.type === WidgetType.INTRO_OFFER
                  ? await validateIntroOfferWidgetConfig(input.config, scope)
                  : input.type === WidgetType.EVENT
                    ? await validateEventWidgetConfig(input.config, scope)
                    : input.type === WidgetType.ON_DEMAND
                      ? await validateOnDemandWidgetConfig(input.config, scope)
                      : input.type === WidgetType.REFERRAL
                        ? await validateReferralWidgetConfig(input.config, scope)
                      : await validateMembershipWidgetConfig(input.config, scope)
          : undefined;
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(widgetConfig)
          .set({
            ...(input.name ? { name: input.name } : {}),
            ...(config ? { config } : {}),
            ...("isActive" in input ? { isActive: input.isActive } : {}),
            updatedAt: new Date(),
          })
          .where(and(eq(widgetConfig.id, input.id), widgetScopeWhere(scope)))
          .returning();
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
        if ("isActive" in input && input.isActive === false) {
          await tx
            .update(publicationTarget)
            .set({ status: "PAUSED", updatedAt: new Date() })
            .where(
              and(
                targetScopeWhere(scope),
                eq(publicationTarget.kind, "WIDGET"),
                eq(publicationTarget.sourceId, input.id),
                eq(publicationTarget.status, "PUBLISHED"),
              ),
            );
        }
        return rows;
      });
      return { widget: updated };
    }),

  searchInstructorOptions: publicationViewProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        includeIds: z.array(z.string().cuid()).max(100).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const searchFilter = input.search
        ? ilike(instructor.name, `%${input.search}%`)
        : undefined;
      const includeFilter = input.includeIds.length
        ? inArray(instructor.id, input.includeIds)
        : undefined;
      return db
        .select({ id: instructor.id, name: instructor.name })
        .from(instructor)
        .where(
          and(
            eq(instructor.organizationId, scope.organizationId),
            scope.locationId
              ? eq(instructor.locationId, scope.locationId)
              : isNull(instructor.locationId),
            eq(instructor.isActive, true),
            eq(instructor.isSystem, false),
            searchFilter && includeFilter
              ? or(searchFilter, includeFilter)
              : searchFilter ?? includeFilter,
          ),
        )
        .orderBy(asc(instructor.name), asc(instructor.id))
        .limit(150);
    }),

  searchBookingOptions: publicationViewProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        includeIds: z.array(z.string().cuid()).max(12).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      if (!scope.locationId) return [];
      const searchFilter = input.search
        ? ilike(bookingEventType.title, `%${input.search}%`)
        : undefined;
      const includeFilter = input.includeIds.length
        ? inArray(bookingEventType.id, input.includeIds)
        : undefined;
      return db
        .select({
          id: bookingEventType.id,
          title: bookingEventType.title,
          length: bookingEventType.length,
        })
        .from(bookingEventType)
        .innerJoin(
          calComCredential,
          and(
            eq(calComCredential.id, bookingEventType.calComCredentialId),
            eq(calComCredential.organizationId, bookingEventType.organizationId),
            eq(calComCredential.locationId, bookingEventType.locationId),
          ),
        )
        .where(
          and(
            eq(bookingEventType.organizationId, scope.organizationId),
            eq(bookingEventType.locationId, scope.locationId),
            eq(bookingEventType.isActive, true),
            eq(bookingEventType.isTeamEvent, false),
            eq(bookingEventType.requiresPayment, false),
            eq(bookingEventType.requiresConfirmation, false),
            isNotNull(bookingEventType.calEventTypeId),
            isNotNull(bookingEventType.calComCredentialId),
            eq(calComCredential.isActive, true),
            isNotNull(calComCredential.apiKey),
            isNotNull(calComCredential.calUsername),
            searchFilter && includeFilter
              ? or(searchFilter, includeFilter)
              : searchFilter ?? includeFilter,
          ),
        )
        .orderBy(asc(bookingEventType.title), asc(bookingEventType.id))
        .limit(50);
    }),

  searchMembershipOptions: publicationViewProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        includeIds: z.array(z.string().cuid()).max(24).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const searchFilter = input.search
        ? ilike(pricingOption.name, `%${input.search}%`)
        : undefined;
      const includeFilter = input.includeIds.length
        ? inArray(pricingOption.id, input.includeIds)
        : undefined;
      return db
        .select({
          id: pricingOption.id,
          name: pricingOption.name,
          price: pricingOption.price,
          currency: pricingOption.currency,
        })
        .from(pricingOption)
        .where(
          and(
            eq(pricingOption.organizationId, scope.organizationId),
            scope.locationId
              ? eq(pricingOption.locationId, scope.locationId)
              : isNull(pricingOption.locationId),
            eq(pricingOption.type, "MEMBERSHIP"),
            eq(pricingOption.isActive, true),
            eq(pricingOption.isPublic, true),
            eq(pricingOption.isHidden, false),
            searchFilter && includeFilter
              ? or(searchFilter, includeFilter)
              : searchFilter ?? includeFilter,
          ),
        )
        .orderBy(asc(pricingOption.name), asc(pricingOption.id))
        .limit(50);
    }),

  searchIntroOfferOptions: publicationViewProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        includeIds: z.array(z.string().cuid()).max(12).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const rows = await selectPublicIntroOffers({
        search: input.search || undefined,
        scope,
      });
      const selectedRows = input.includeIds.length
        ? await selectPublicIntroOffers({ ids: input.includeIds, scope })
        : [];
      const byId = new Map(
        [...selectedRows, ...rows].map((row) => [row.id, row]),
      );
      return [...byId.values()].slice(0, 50).map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        currency: row.currency,
      }));
    }),

  searchEventOptions: publicationViewProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        includeIds: z.array(z.string().cuid()).max(12).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const rows = await selectPublicEventPrograms({
        search: input.search || undefined,
        scope,
        occurrencesPerEvent: 1,
      });
      const selectedRows = input.includeIds.length
        ? await selectPublicEventPrograms({
            ids: input.includeIds,
            scope,
            occurrencesPerEvent: 1,
          })
        : [];
      const byId = new Map(
        [...selectedRows, ...rows].map((row) => [row.id, row]),
      );
      return [...byId.values()].slice(0, 50).map((row) => ({
        id: row.id,
        name: row.name,
        nextStartTime: row.occurrences[0]?.startTime.toISOString() ?? null,
      }));
    }),

  searchOnDemandOptions: publicationViewProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        includeIds: z.array(z.string().cuid()).max(24).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const rows = await selectPublicFreeOnDemandAssets({
        search: input.search || undefined,
        scope,
      });
      const selectedRows = input.includeIds.length
        ? await selectPublicFreeOnDemandAssets({
            ids: input.includeIds,
            scope,
          })
        : [];
      const byId = new Map(
        [...selectedRows, ...rows].map((row) => [row.id, row]),
      );
      return [...byId.values()].slice(0, 100).map((row) => ({
        id: row.id,
        title: row.title,
        durationSeconds: row.durationSeconds,
      }));
    }),

  searchReferralProgramOptions: publicationViewProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).default(""),
        includeIds: z.array(z.string().min(1).max(128)).max(1).default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const rows = await selectPublicReferralPrograms({
        search: input.search || undefined,
        scope,
      });
      const selectedRows = input.includeIds.length
        ? await selectPublicReferralPrograms({ ids: input.includeIds, scope })
        : [];
      const byId = new Map(
        [...selectedRows, ...rows].map((row) => [row.id, row]),
      );
      return [...byId.values()].slice(0, 25).map((row) => ({
        id: row.id,
        name: row.name,
        referrerRewardType: row.referrerRewardType,
        refereeRewardType: row.refereeRewardType,
      }));
    }),

  delete: publicationManageProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        archivePublication: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      await db.transaction(async (tx) => {
        const [widget] = await tx
          .select({ id: widgetConfig.id })
          .from(widgetConfig)
          .where(and(eq(widgetConfig.id, input.id), widgetScopeWhere(scope)))
          .limit(1);
        if (!widget) throw new TRPCError({ code: "NOT_FOUND" });
        const [target] = await tx
          .select({ id: publicationTarget.id })
          .from(publicationTarget)
          .where(
            and(
              targetScopeWhere(scope),
              eq(publicationTarget.kind, "WIDGET"),
              eq(publicationTarget.sourceId, input.id),
              ne(publicationTarget.status, "ARCHIVED"),
            ),
          )
          .limit(1);
        if (target && !input.archivePublication) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Confirm publication archival before deleting this widget.",
          });
        }
        if (target) {
          await tx
            .update(publicationTarget)
            .set({
              status: "ARCHIVED",
              updatedAt: new Date(),
              updatedById: ctx.auth.user.id,
            })
            .where(
              and(
                targetScopeWhere(scope),
                eq(publicationTarget.kind, "WIDGET"),
                eq(publicationTarget.sourceId, input.id),
                ne(publicationTarget.status, "ARCHIVED"),
              ),
            );
        }
        await tx
          .delete(widgetConfig)
          .where(and(eq(widgetConfig.id, input.id), widgetScopeWhere(scope)));
      });
      return { success: true };
    }),

  getEmbedCode: publicationViewProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const scope = requireWidgetScope(ctx);
      const [widget, target, organizationSlug] = await Promise.all([
        getWidgetOrThrow(input.id, scope),
        getPublishedWidgetTarget(input.id, scope),
        getOrganizationSlug(scope.organizationId),
      ]);
      const embed = buildWidgetEmbed({ widget, target, organizationSlug });
      const health = await getWidgetPublicationHealth({
        widgets: [widget],
        targets: target ? [target] : [],
        scope,
      });
      if (!embed || !health.get(widget.id)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Publish this widget and configure at least one allowed website origin before copying embed code.",
        });
      }
      return embed;
    }),
});
