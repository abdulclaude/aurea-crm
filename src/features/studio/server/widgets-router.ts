import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { db } from "@/db";
import { WidgetType } from "@/db/enums";
import { organization, widgetConfig } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq } from "drizzle-orm";

const WidgetConfigSchema = z.object({
  primaryColor: z.string().default("#6366f1"),
  accentColor: z.string().default("#a855f7"),
  fontFamily: z.string().default("Inter"),
  borderRadius: z.number().int().min(0).max(24).default(8),
  showPrices: z.boolean().default(true),
  showInstructors: z.boolean().default(true),
  maxDaysAhead: z.number().int().min(1).max(90).default(14),
  classTypeIds: z.array(z.string()).default([]),
});

type WidgetConfigRow = typeof widgetConfig.$inferSelect;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === "object") {
    const result: { [key: string]: JsonValue } = {};
    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      result[key] = toJsonValue(item);
    }
    return result;
  }

  return {};
};

const serializeWidget = (widget: WidgetConfigRow) => ({
  ...widget,
  config: toJsonValue(widget.config),
});

const getWidgetOrThrow = async (id: string, organizationId: string) => {
  const [widget] = await db
    .select()
    .from(widgetConfig)
    .where(and(eq(widgetConfig.id, id), eq(widgetConfig.organizationId, organizationId)))
    .limit(1);

  if (!widget) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return widget;
};

export const widgetsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

    const widgets = await db
      .select()
      .from(widgetConfig)
      .where(eq(widgetConfig.organizationId, ctx.orgId))
      .orderBy(desc(widgetConfig.createdAt));

    return { widgets: widgets.map(serializeWidget) };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: z.nativeEnum(WidgetType),
        config: WidgetConfigSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const [widget] = await db
        .insert(widgetConfig)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          name: input.name,
          type: input.type,
          config: input.config ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { widget: serializeWidget(widget) };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        config: WidgetConfigSchema.optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      await getWidgetOrThrow(input.id, ctx.orgId);

      const [updated] = await db
        .update(widgetConfig)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.config ? { config: input.config } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(widgetConfig.id, input.id))
        .returning();

      return { widget: serializeWidget(updated) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      await getWidgetOrThrow(input.id, ctx.orgId);

      await db.delete(widgetConfig).where(eq(widgetConfig.id, input.id));
      return { success: true };
    }),

  getEmbedCode: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organisation" });

      const widget = await getWidgetOrThrow(input.id, ctx.orgId);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.aurea.studio";
      const [org] = await db
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, ctx.orgId))
        .limit(1);
      const slug = org?.slug ?? ctx.orgId;

      const iframeUrl = `${appUrl}/embed/${slug}/${widget.type.toLowerCase()}?widget=${widget.id}`;
      const iframeCode = `<iframe src="${iframeUrl}" width="100%" height="600" frameborder="0" allowtransparency="true" loading="lazy"></iframe>`;

      const scriptCode = `<div id="aurea-widget-${widget.id}"></div>
<script src="${appUrl}/embed/widget.js" data-widget-id="${widget.id}" data-org="${slug}" async></script>`;

      return { iframeCode, scriptCode, previewUrl: iframeUrl };
    }),
});
