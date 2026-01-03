import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Resend API key is not configured",
    });
  }

  return new Resend(process.env.RESEND_API_KEY);
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
    .query(async ({ input }) => {
      const resend = getResendClient();
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
    .query(async ({ input }) => {
      const resend = getResendClient();
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
