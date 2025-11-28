import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@prisma/client";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import z from "zod";
import {
  configureTelegramWebhook,
  removeTelegramWebhook,
} from "@/features/telegram/server/webhook-manager";

const credentialScopeWhere = (ctx: {
  auth: { user: { id: string } };
  subaccountId?: string | null;
}) => ({
  userId: ctx.auth.user.id,
  subaccountId: ctx.subaccountId ?? null,
});

export const credentialsRouter = createTRPCRouter({
  create: premiumProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().min(1, "Value is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, value, type } = input;

      return prisma.$transaction(async (tx) => {
        const credential = await tx.credential.create({
          data: {
            name,
            type,
            userId: ctx.auth.user.id,
            subaccountId: ctx.subaccountId ?? null,
            value: encrypt(value),
          },
        });

        if (type === CredentialType.TELEGRAM_BOT) {
          await configureTelegramWebhook({
            credential,
            token: value,
            tx,
          });
        }

        return credential;
      });
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.$transaction(async (tx) => {
        const credential = await tx.credential.findFirstOrThrow({
          where: {
            id: input.id,
            ...credentialScopeWhere(ctx),
          },
        });

        if (credential.type === CredentialType.TELEGRAM_BOT) {
          const token = decrypt(credential.value);
          await removeTelegramWebhook({ token });
        }

        return tx.credential.delete({
          where: {
            id: credential.id,
          },
        });
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        type: z.enum(CredentialType),
        value: z.string().min(1, "Value is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, type, value } = input;

      return prisma.$transaction(async (tx) => {
        const existing = await tx.credential.findFirstOrThrow({
          where: {
            id,
            ...credentialScopeWhere(ctx),
          },
        });

        const updated = await tx.credential.update({
          where: {
            id,
          },
          data: {
            name,
            type,
            value: encrypt(value),
          },
        });

        if (type === CredentialType.TELEGRAM_BOT) {
          await configureTelegramWebhook({
            credential: updated,
            token: value,
            tx,
          });
        } else if (existing.type === CredentialType.TELEGRAM_BOT) {
          const token = decrypt(existing.value);
          await removeTelegramWebhook({ token });
        }

        return updated;
      });
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.credential.findFirstOrThrow({
        where: {
          id: input.id,
          ...credentialScopeWhere(ctx),
        },
      });
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
      const scope = credentialScopeWhere(ctx);

      const [items, totalCount] = await Promise.all([
        prisma.credential.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            ...scope,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.credential.count({
          where: {
            ...scope,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
  getByType: protectedProcedure
    .input(z.object({ type: z.enum(CredentialType) }))
    .query(async ({ input, ctx }) => {
      const { type } = input;

      return prisma.credential.findMany({
        where: {
          type,
          ...credentialScopeWhere(ctx),
        },
        orderBy: { updatedAt: "desc" },
      });
    }),
});
