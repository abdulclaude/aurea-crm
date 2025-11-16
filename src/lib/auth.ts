import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";

import prisma from "./db";

import { polar, checkout, portal } from "@polar-sh/better-auth";
import { polarClient } from "@/lib/polar";

const parseScopes = (value?: string) =>
  value
    ?.split(",")
    .map((scope) => scope.trim())
    .filter(Boolean) ?? [];

const FACEBOOK_DEFAULT_SCOPES = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
];

const FACEBOOK_OPTIONAL_SCOPES = parseScopes(
  process.env.FACEBOOK_OPTIONAL_SCOPES
);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
      scopes: [...FACEBOOK_DEFAULT_SCOPES, ...FACEBOOK_OPTIONAL_SCOPES],
      redirectUri: `${process.env.APP_URL}/api/auth/callback/facebook`,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      accessType: "offline",
      prompt: "select_account consent",
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
      ],
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  plugins: [
    organization(),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "ea5b8430-6bb7-4cb1-a353-0effb982f539",
              slug: "pro", // Custom slug for easy reference in Checkout URL, e.g. /checkout/Aurea-CRM
            },
          ],
          successUrl: process.env.POLAR_SUCCESS_URL,
          authenticatedUsersOnly: true,
        }),
        portal(),
      ],
    }),
  ],
});
