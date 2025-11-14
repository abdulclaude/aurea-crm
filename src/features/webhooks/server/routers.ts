import { PAGINATION } from "@/config/constants";
import { WebhookProvider } from "@/generated/prisma/enums";
import type { Webhook } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import z from "zod";

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.enum(WebhookProvider),
  url: z.string().url("Webhook URL must be a valid URL"),
  description: z.string().max(500).optional().or(z.literal("")),
  signingSecret: z.string().optional().or(z.literal("")),
});

const serializeWebhook = (webhook: Webhook) => ({
  ...webhook,
  signingSecret: webhook.signingSecret ? decrypt(webhook.signingSecret) : null,
});

export const webhooksRouter = createTRPCRouter({
  create: premiumProcedure
    .input(webhookSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.webhook
        .create({
          data: {
            name: input.name,
            provider: input.provider,
            url: input.url,
            description: input.description || undefined,
            signingSecret: input.signingSecret
              ? encrypt(input.signingSecret)
              : undefined,
            userId: ctx.auth.user.id,
          },
        })
        .then(serializeWebhook);
    }),
  update: protectedProcedure
    .input(webhookSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return prisma.webhook
        .update({
          where: { id, userId: ctx.auth.user.id },
          data: {
            name: rest.name,
            provider: rest.provider,
            url: rest.url,
            description: rest.description || undefined,
            signingSecret: rest.signingSecret
              ? encrypt(rest.signingSecret)
              : null,
          },
        })
        .then(serializeWebhook);
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.webhook.delete({
        where: { id: input.id, userId: ctx.auth.user.id },
      });
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.webhook
        .findFirstOrThrow({
          where: { id: input.id, userId: ctx.auth.user.id },
        })
        .then(serializeWebhook);
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.webhook.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.webhook.count({
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items: items.map(serializeWebhook),
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),
  getByProvider: protectedProcedure
    .input(z.object({ provider: z.enum(WebhookProvider) }))
    .query(async ({ ctx, input }) => {
      const items = await prisma.webhook.findMany({
        where: { provider: input.provider, userId: ctx.auth.user.id },
        orderBy: { updatedAt: "desc" },
      });

      return items.map(serializeWebhook);
    }),
});
