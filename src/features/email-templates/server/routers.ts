import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { requireCapability } from "@/features/permissions/server/authorization";
import { resolveProviderAccount } from "@/features/provider-accounts/server/resolver";

type EmailTemplateContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

async function getResendClient(ctx: EmailTemplateContext) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select an organization before viewing provider templates.",
    });
  }
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability: "provider.manage",
  });
  const account = await resolveProviderAccount({
    provider: "RESEND",
    scope: {
      organizationId: ctx.orgId,
      locationId: ctx.locationId ?? null,
    },
  });
  return new Resend(account.secret);
}

export const emailTemplatesRouter = createTRPCRouter({
  listResend: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          before: z.string().optional(),
          after: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const resend = await getResendClient(ctx);
      const pagination = input?.before
        ? { limit: input?.limit, before: input.before }
        : input?.after
          ? { limit: input?.limit, after: input.after }
          : { limit: input?.limit };

      const { data, error } = await resend.templates.list(pagination);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch Resend templates: ${error.message}`,
        });
      }

      return data?.data ?? [];
    }),
  getResend: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const resend = await getResendClient(ctx);
      const { data, error } = await resend.templates.get(input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch Resend template: ${error.message}`,
        });
      }

      return data;
    }),
});
