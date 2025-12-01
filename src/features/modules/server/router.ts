import { z } from "zod";
import {
  protectedProcedure,
  premiumProcedure,
  createTRPCRouter,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import prisma from "@/lib/db";
import { ModuleType, ActivityAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { logAnalytics } from "@/lib/analytics-logger";

// Module configurations with premium requirements
export const MODULE_CONFIG = {
  [ModuleType.TIME_TRACKING]: {
    name: "Time Tracking",
    description:
      "Track employee hours, shifts, and billable time with clock-in/out functionality",
    icon: "Clock",
    requiresPremium: true,
    features: [
      "Clock in/out with multiple methods (Manual, QR Code)",
      "Timesheet management and approval workflows",
      "Billable hours tracking with rates",
      "Export to PDF for invoicing",
      "Integration with Contacts and Deals",
    ],
  },
  [ModuleType.INVOICING]: {
    name: "Invoicing",
    description: "Generate and manage invoices from time logs and deals",
    icon: "FileText",
    requiresPremium: true,
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
    requiresPremium: true,
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
    requiresPremium: false,
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
    requiresPremium: true,
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
    requiresPremium: true,
    features: [
      "Task boards",
      "Team assignments",
      "Time tracking integration",
      "Milestone tracking",
    ],
  },
} as const;

export const modulesRouter = createTRPCRouter({
  // List all available modules with enabled status
  listAvailable: protectedProcedure.query(async ({ ctx }) => {
    // If no auth, return all modules as disabled
    if (!ctx.auth?.user) {
      return Object.entries(MODULE_CONFIG).map(([type, config]) => ({
        type: type as ModuleType,
        ...config,
        enabled: false,
      }));
    }

    // Check for modules at organization or subaccount level
    const whereConditions: any[] = [];

    // Add organization filter if org exists (organization-level modules)
    if (ctx.orgId) {
      whereConditions.push({
        organizationId: ctx.orgId,
        subaccountId: null,
        enabled: true,
      });
    }

    // Add subaccount filter if subaccount exists (subaccount overrides)
    if (ctx.subaccountId) {
      whereConditions.push({
        subaccountId: ctx.subaccountId,
        enabled: true,
      });
    }

    // If no context at all, return all disabled
    if (whereConditions.length === 0) {
      return Object.entries(MODULE_CONFIG).map(([type, config]) => ({
        type: type as ModuleType,
        ...config,
        enabled: false,
      }));
    }

    // Get enabled modules
    const enabledModules = await prisma.subaccountModule.findMany({
      where: {
        OR: whereConditions,
      },
    });

    const enabledModuleTypes = new Set(enabledModules.map((m) => m.moduleType));

    // Return all modules with their enabled status
    return Object.entries(MODULE_CONFIG).map(([type, config]) => ({
      type: type as ModuleType,
      ...config,
      enabled: enabledModuleTypes.has(type as ModuleType),
    }));
  }),

  // Check if a specific module is enabled
  isEnabled: protectedProcedure
    .input(z.object({ moduleType: z.nativeEnum(ModuleType) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        return false;
      }

      const module = await prisma.subaccountModule.findUnique({
        where: {
          subaccountId_moduleType: {
            subaccountId: ctx.subaccountId,
            moduleType: input.moduleType,
          },
        },
      });

      return module?.enabled ?? false;
    }),

  // Enable a module (premium check for premium modules)
  enable: protectedProcedure
    .input(
      z.object({
        moduleType: z.nativeEnum(ModuleType),
        config: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Require either org or subaccount context
      if (!ctx.orgId && !ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization or subaccount context",
        });
      }

      const moduleConfig = MODULE_CONFIG[input.moduleType];

      // Check if module requires premium
      if (moduleConfig.requiresPremium) {
        // TODO: Add actual premium subscription check here
        // For now, we'll allow it
      }

      // Prefer subaccount over organization
      const isSubaccountLevel = !!ctx.subaccountId;

      const module = await prisma.subaccountModule.upsert({
        where: isSubaccountLevel
          ? {
              subaccountId_moduleType: {
                subaccountId: ctx.subaccountId ?? "",
                moduleType: input.moduleType,
              },
            }
          : {
              organizationId_moduleType: {
                organizationId: ctx.orgId ?? "",
                moduleType: input.moduleType,
              },
            },
        create: {
          organizationId: isSubaccountLevel ? undefined : ctx.orgId,
          subaccountId: isSubaccountLevel ? ctx.subaccountId : undefined,
          moduleType: input.moduleType,
          enabled: true,
          config: input.config as Prisma.InputJsonValue,
        },
        update: {
          enabled: true,
          config: input.config as Prisma.InputJsonValue,
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        subaccountId: ctx.subaccountId ?? null,
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
          is_premium: moduleConfig.requiresPremium,
          is_subaccount_level: isSubaccountLevel,
        },
      });

      return module;
    }),

  // Disable a module
  disable: protectedProcedure
    .input(z.object({ moduleType: z.nativeEnum(ModuleType) }))
    .mutation(async ({ ctx, input }) => {
      // Require either org or subaccount context
      if (!ctx.orgId && !ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in an organization or subaccount context",
        });
      }

      // Prefer subaccount over organization
      const isSubaccountLevel = !!ctx.subaccountId;

      const moduleConfig = MODULE_CONFIG[input.moduleType];
      const module = await prisma.subaccountModule.upsert({
        where: isSubaccountLevel
          ? {
              subaccountId_moduleType: {
                subaccountId: ctx.subaccountId ?? "",
                moduleType: input.moduleType,
              },
            }
          : {
              organizationId_moduleType: {
                organizationId: ctx.orgId ?? "",
                moduleType: input.moduleType,
              },
            },
        create: {
          organizationId: isSubaccountLevel ? undefined : ctx.orgId,
          subaccountId: isSubaccountLevel ? ctx.subaccountId : undefined,
          moduleType: input.moduleType,
          enabled: false,
        },
        update: {
          enabled: false,
        },
      });

      // Log analytics
      await logAnalytics({
        organizationId: ctx.orgId ?? "",
        subaccountId: ctx.subaccountId ?? null,
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
          is_subaccount_level: isSubaccountLevel,
        },
      });

      return module;
    }),

  // Update module configuration
  updateConfig: protectedProcedure
    .input(
      z.object({
        moduleType: z.nativeEnum(ModuleType),
        config: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be in a subaccount context",
        });
      }

      const module = await prisma.subaccountModule.update({
        where: {
          subaccountId_moduleType: {
            subaccountId: ctx.subaccountId,
            moduleType: input.moduleType,
          },
        },
        data: {
          config: input.config as Prisma.InputJsonValue,
        },
      });

      return module;
    }),
});
