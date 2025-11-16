import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";

export const organizationsRouter = createTRPCRouter({
  /**
   * Create an agency (personal/main org) with extended profile.
   * Returns created organization id.
   */
  createAgency: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(2),
        logo: z.url().optional(),
        website: z.url().optional(),
        billingEmail: z.email().optional(),
        phone: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyName, logo } = input;

      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const organizationId = crypto.randomUUID();

      await prisma.organization.create({
        data: {
          id: organizationId,
          name: companyName,
          slug,
          logo: logo || null,
          createdAt: new Date(),
        },
      });

      await prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          userId: ctx.auth.user.id,
          role: "owner",
          createdAt: new Date(),
        },
      });

      // Do not create a Subaccount for the agency itself; it's a first-class organization.

      return { organizationId };
    }),
  /**
   * Ensure the current user has a personal/main organization.
   * Returns the organization after ensuring it exists.
   */
  ensureMain: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const existing = await prisma.member.findFirst({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      return existing.organization;
    }

    const baseName =
      ctx.auth.user.name || `${ctx.auth.user.email.split("@")[0]}'s Workspace`;
    const slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const organization = await prisma.organization.create({
      data: {
        id: crypto.randomUUID(),
        name: baseName,
        slug,
        createdAt: new Date(),
      },
    });

    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: organization.id,
        userId,
        role: "owner",
        createdAt: new Date(),
      },
    });

    // Do not create a Subaccount for the agency itself.

    return organization;
  }),
  /**
   * Return the active organization id from the session.
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return {
      activeOrganizationId: ctx.orgId ?? null,
      activeSubaccountId: ctx.subaccountId ?? null,
      activeSubaccount: ctx.subaccount
        ? {
            id: ctx.subaccount.id,
            companyName: ctx.subaccount.companyName,
            logo: ctx.subaccount.logo,
            slug: ctx.subaccount.slug,
          }
        : null,
    };
  }),
  /**
   * Organizations where the current user is a member.
   */
  getMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await prisma.member.findMany({
      where: { userId: ctx.auth.user.id },
      include: {
        organization: {
          include: {
            subaccounts: true,
            members: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      ownerName: m.organization.members[0]?.user?.name ?? null,
      ownerEmail: m.organization.members[0]?.user?.email ?? null,
      role: m.role,
      subaccount:
        (m.organization as unknown as { subaccounts?: unknown[] })
          .subaccounts?.[0] ?? null,
    }));
  }),
  /**
   * Toggle the active subaccount (client) context for the current session.
   */
  setActiveSubaccount: protectedProcedure
    .input(
      z.object({
        subaccountId: z.string().cuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      const sessionToken = ctx.auth.session.token;

      if (!input.subaccountId) {
        await prisma.session.update({
          where: { token: sessionToken },
          data: { activeSubaccountId: null },
        });

        return {
          activeSubaccountId: null,
          activeSubaccount: null,
        };
      }

      const subaccount = await prisma.subaccount.findFirst({
        where: {
          id: input.subaccountId,
          organizationId: ctx.orgId,
        },
      });

      if (!subaccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subaccount not found for this organization.",
        });
      }

      await prisma.session.update({
        where: { token: sessionToken },
        data: { activeSubaccountId: subaccount.id },
      });

      return {
        activeSubaccountId: subaccount.id,
        activeSubaccount: {
          id: subaccount.id,
          companyName: subaccount.companyName,
          logo: subaccount.logo,
          slug: subaccount.slug,
        },
      };
    }),

  /**
   * Create a subaccount (client) under the active or provided organization.
   */
  createSubaccount: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        companyName: z.string().min(2),
        logo: z.url().optional(),
        website: z.url().optional(),
        billingEmail: z.email().optional(),
        phone: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        industry: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = input.organizationId ?? ctx.orgId;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization found.",
        });
      }

      const slugBase = input.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slugSuffix = crypto.randomUUID().slice(0, 6);
      const slug = `${slugBase}-${slugSuffix}`;

      const sub = await prisma.subaccount.create({
        data: {
          organizationId,
          companyName: input.companyName,
          logo: input.logo || null,
          website: input.website || null,
          billingEmail: input.billingEmail || null,
          phone: input.phone || null,
          addressLine1: input.addressLine1 || null,
          addressLine2: input.addressLine2 || null,
          city: input.city || null,
          state: input.state || null,
          postalCode: input.postalCode || null,
          country: input.country || null,
          timezone: input.timezone || undefined,
          industry: input.industry || null,
          createdByUserId: ctx.auth.user.id,
          slug,
        },
      });
      return sub;
    }),

  /**
   * Organizations (clients) created by me (owner/agency).
   * Uses Subaccount.createdByUserId to identify ownership.
   */
  getClients: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization found.",
      });
    }

    const membership = await prisma.member.findFirst({
      where: {
        organizationId: ctx.orgId,
        userId: ctx.auth.user.id,
      },
    });

    if (!membership || membership.role !== "owner") {
      return [];
    }

    const subaccounts = await prisma.subaccount.findMany({
      where: {
        organizationId: ctx.orgId,
      },
      include: {
        organization: {
          include: {
            invitations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return subaccounts.map((s) => ({
      id: s.organizationId,
      subaccountId: s.id,
      name: s.companyName || s.organization.name,
      slug: s.slug ?? s.organization.slug,
      logo: s.logo ?? s.organization.logo,
      profile: s,
      pendingInvites: (s.organization.invitations || []).filter(
        (inv) => inv.status !== "accepted" && inv.status !== "declined"
      ).length,
      isActive: ctx.subaccountId === s.id,
    }));
  }),

  /**
   * Upsert subaccount profile for an organization.
   */
  upsertSubaccount: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        companyName: z.string().min(1),
        website: z.string().url().optional().or(z.literal("")),
        billingEmail: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional().or(z.literal("")),
        addressLine1: z.string().optional().or(z.literal("")),
        addressLine2: z.string().optional().or(z.literal("")),
        city: z.string().optional().or(z.literal("")),
        state: z.string().optional().or(z.literal("")),
        postalCode: z.string().optional().or(z.literal("")),
        country: z.string().optional().or(z.literal("")),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        organizationId,
        companyName,
        website,
        billingEmail,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        timezone,
      } = input;

      const subaccount = await prisma.subaccount.upsert({
        where: { id: organizationId },
        update: {
          companyName,
          website: website || null,
          billingEmail: billingEmail || null,
          phone: phone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          country: country || null,
          timezone: timezone || undefined,
        },
        create: {
          organizationId,
          companyName,
          website: website || null,
          billingEmail: billingEmail || null,
          phone: phone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          country: country || null,
          timezone: timezone || undefined,
          createdByUserId: ctx.auth.user.id,
        },
      });

      return subaccount;
    }),
});
