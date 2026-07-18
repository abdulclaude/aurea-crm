import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import twilio from "twilio";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import { twilioPlatformProviderConfigSchema } from "@/features/provider-accounts/contracts";
import { decrypt } from "@/lib/encryption";
import { getTwilioParentCredentials } from "./platform-credentials";

export function getTwilioParentClient() {
  const credentials = getTwilioParentCredentials();
  return twilio(credentials.accountSid, credentials.authToken, {
    autoRetry: false,
    timeout: 30_000,
  });
}

export async function resolveTwilioPlatformAccount(input: {
  organizationId: string;
  allowProvisioning?: boolean;
}) {
  const [account] = await db
    .select()
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, input.organizationId),
        isNull(providerAccount.locationId),
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
      ),
    )
    .limit(1);
  const config = twilioPlatformProviderConfigSchema.safeParse(account?.config);
  if (!account || !config.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Provision the managed Twilio account before continuing.",
    });
  }
  if (!input.allowProvisioning && account.status !== "ACTIVE") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The managed Twilio account is not active yet.",
    });
  }
  if (!account.externalAccountId || !account.encryptedSecret) {
    if (input.allowProvisioning) {
      return { account, config: config.data, client: null, credentials: null };
    }
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The managed Twilio account is still provisioning.",
    });
  }
  const authToken = decrypt(account.encryptedSecret);
  return {
    account,
    config: config.data,
    client: twilio(account.externalAccountId, authToken, {
      autoRetry: false,
      timeout: 30_000,
    }),
    credentials: { accountSid: account.externalAccountId, authToken },
  };
}
