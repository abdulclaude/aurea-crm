import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { ActivityAction, ModuleType } from "@/db/enums";
import { locationModule } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import { logAnalytics } from "@/lib/analytics-logger";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";

export const MODULE_CONFIG = {
  [ModuleType.TIME_TRACKING]: {
    name: "Time Tracking",
    description:
      "Track employee hours, shifts, and billable time with clock-in/out functionality",
    icon: "Clock",
    features: [
      "Clock in/out with multiple methods (Manual, QR Code)",
      "Timesheet management and approval workflows",
      "Billable hours tracking with rates",
      "Export to PDF for invoicing",
      "Integration with Clients and Deals",
    ],
  },
  [ModuleType.INVOICING]: {
    name: "Invoicing",
    description: "Generate and manage invoices from time logs and deals",
    icon: "FileText",
    features: [
      "Auto-generate invoices from time logs",
      "Customizable invoice templates",
      "Payment tracking",
      "Stripe integration",
    ],
  },
  [ModuleType.INVENTORY]: {
    name: "Inventory Management",
    description: "Track products, stock levels, and manage orders",
    icon: "Package",
    features: [
      "Product catalog",
      "Stock level tracking",
      "Low stock alerts",
      "Order management",
    ],
  },
  [ModuleType.BOOKING_CALENDAR]: {
    name: "Booking Calendar",
    description: "Schedule appointments and manage availability",
    icon: "Calendar",
    features: [
      "Client self-booking",
      "Calendar sync",
      "Automated reminders",
      "Buffer time configuration",
    ],
  },
  [ModuleType.DOCUMENT_SIGNING]: {
    name: "Document Signing",
    description: "Send and track documents for e-signature",
    icon: "FileSignature",
    features: [
      "E-signature collection",
      "Document templates",
      "Audit trail",
      "Automated reminders",
    ],
  },
  [ModuleType.PROJECT_MANAGEMENT]: {
    name: "Project Management",
    description: "Manage projects, tasks, and team collaboration",
    icon: "Kanban",
    features: [
      "Task boards",
      "Team assignments",
      "Time tracking integration",
      "Milestone tracking",
    ],
  },
  [ModuleType.PILATES_STUDIO]: {
    name: "Pilates Studio",
    description:
      "Legacy studio module - use Studio Core instead for full studio management",
    icon: "Dumbbell",
    features: [
      "Mindbody integration for class sync",
      "Class schedule display on funnels",
      "Client booking management",
      "Membership tracking",
      "Attendance analytics",
      "Studio-specific automation triggers",
    ],
  },
  [ModuleType.STUDIO_CORE]: {
    name: "Studio",
    description:
      "Complete fitness studio management with class scheduling, memberships, bookings, check-in, and instructor dashboards",
    icon: "Dumbbell",
    features: [
      "Class types and scheduling",
      "Membership plans and subscriptions",
      "Member booking and waitlists",
      "QR code and kiosk check-in",
      "Instructor management and profiles",
      "Room and resource management",
      "Attendance analytics and streaks",
      "Mindbody data import",
    ],
  },
} as const;

const moduleTypes = Object.values(ModuleType);
const moduleConfigSchema = z.record(z.string(), z.unknown());

async function requireModuleManagement(ctx: {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
}) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing modules.",
    });
  }

  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability: "settings.manage",
    resource: {
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
  });
}

function moduleList(enabledModuleTypes: Set<ModuleType>) {
  return moduleTypes.map((type) => ({
    type,
    ...MODULE_CONFIG[type],
    enabled: enabledModuleTypes.has(type),
  }));
}

async function upsertModule(params: {
  organizationId: string | null;
  locationId: string | null;
  moduleType: ModuleType;
  enabled: boolean;
  config?: Record<string, unknown>;
}) {
  const existing = await db.query.locationModule.findFirst({
    where: params.locationId
      ? and(
          eq(locationModule.locationId, params.locationId),
          eq(locationModule.moduleType, params.moduleType)
        )
      : and(
          eq(locationModule.organizationId, params.organizationId ?? ""),
          eq(locationModule.moduleType, params.moduleType),
          isNull(locationModule.locationId)
        ),
  });

  if (existing) {
    const [updated] = await db
      .update(locationModule)
      .set({
        enabled: params.enabled,
        config: params.config ?? existing.config,
        updatedAt: new Date(),
      })
      .where(eq(locationModule.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(locationModule)
    .values({
      id: randomUUID(),
      organizationId: params.locationId ? null : params.organizationId,
      locationId: params.locationId,
      moduleType: params.moduleType,
      enabled: params.enabled,
      config: params.config,
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

export const modulesRouter = createTRPCRouter({
  listAvailable: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth?.user) {
      return moduleList(new Set());
    }

    const scopeConditions: SQL[] = [];
    if (ctx.orgId) {
      const condition = and(
        eq(locationModule.organizationId, ctx.orgId),
        isNull(locationModule.locationId),
        eq(locationModule.enabled, true)
      );
      if (condition) scopeConditions.push(condition);
    }
    if (ctx.locationId) {
      const condition = and(
        eq(locationModule.locationId, ctx.locationId),
        eq(locationModule.enabled, true)
      );
      if (condition) scopeConditions.push(condition);
    }

    if (scopeConditions.length === 0) {
      return moduleList(new Set());
    }

    const where = scopeConditions.length === 1 ? scopeConditions[0] : or(...scopeConditions);
    if (!where) return moduleList(new Set());

    const enabledModules = await db.query.locationModule.findMany({ where });
    return moduleList(new Set(enabledModules.map((module) => module.moduleType)));
  }),

  isEnabled: protectedProcedure
    .input(z.object({ moduleType: z.nativeEnum(ModuleType) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.locationId) {
        return false;
      }

      const module = await db.query.locationModule.findFirst({
        where: and(
          eq(locationModule.locationId, ctx.locationId),
          eq(locationModule.moduleType, input.moduleType)
        ),
      });

      return module?.enabled ?? false;
    }),

  enable: protectedProcedure
    .input(
      z.object({
        moduleType: z.nativeEnum(ModuleType),
        config: moduleConfigSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireModuleManagement(ctx);

      const moduleConfig = MODULE_CONFIG[input.moduleType];
      const isLocationLevel = !!ctx.locationId;
      const module = await upsertModule({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        moduleType: input.moduleType,
        enabled: true,
        config: input.config,
      });

      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "module",
        entityId: module.id,
        entityName: moduleConfig.name,
        metadata: {
          moduleType: input.moduleType,
          enabled: true,
        },
        posthogProperties: {
          module_type: input.moduleType,
          enabled: true,
          is_location_level: isLocationLevel,
        },
      });

      return module;
    }),

  disable: protectedProcedure
    .input(z.object({ moduleType: z.nativeEnum(ModuleType) }))
    .mutation(async ({ ctx, input }) => {
      await requireModuleManagement(ctx);

      const isLocationLevel = !!ctx.locationId;
      const moduleConfig = MODULE_CONFIG[input.moduleType];
      const module = await upsertModule({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
        moduleType: input.moduleType,
        enabled: false,
      });

      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "module",
        entityId: module.id,
        entityName: moduleConfig.name,
        metadata: {
          moduleType: input.moduleType,
          enabled: false,
        },
        posthogProperties: {
          module_type: input.moduleType,
          enabled: false,
          is_location_level: isLocationLevel,
        },
      });

      return module;
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        moduleType: z.nativeEnum(ModuleType),
        config: moduleConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.locationId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Select a location before configuring modules.",
        });
      }
      await requireModuleManagement(ctx);

      const [module] = await db
        .update(locationModule)
        .set({ config: input.config, updatedAt: new Date() })
        .where(
          and(
            eq(locationModule.locationId, ctx.locationId),
            eq(locationModule.moduleType, input.moduleType)
          )
        )
        .returning();

      if (!module) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      return module;
    }),
});
