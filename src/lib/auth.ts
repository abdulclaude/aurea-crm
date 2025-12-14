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

const FACEBOOK_DEFAULT_SCOPES = parseScopes(
  process.env.FACEBOOK_DEFAULT_SCOPES
);

const FACEBOOK_OPTIONAL_SCOPES = parseScopes(
  process.env.FACEBOOK_OPTIONAL_SCOPES
);

// process.env.APP_URL ||
// process.env.BETTER_AUTH_URL,

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3000", process.env.APP_URL || ""].filter(
    Boolean
  ),
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
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/forms.responses.readonly",
        "https://www.googleapis.com/auth/forms.body.readonly",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
      ],
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      tenantId: "common",
      scopes: [
        "openid",
        "email",
        "profile",
        "offline_access",
        "Mail.ReadWrite",
        "Mail.Send",
        "Files.ReadWrite.All",
      ],
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID ?? "",
      clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
      scopes: [
        "channels:read",
        "channels:write",
        "chat:write",
        "files:write",
        "users:read",
      ],
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      scopes: ["identify", "email", "guilds", "messages.read"],
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
