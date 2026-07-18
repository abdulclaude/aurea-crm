import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { inboxRoute } from "@/db/schema";
import {
  buildConversationReplyAddress,
  createConversationReplyToken,
  hashConversationReplyToken,
} from "@/features/inbox/lib/reply-routing";
import { getInboxReplyRoutingSecret } from "@/features/inbox/server/reply-routing-secret";

export async function resolveInboxOutboundRoute(input: {
  organizationId: string;
  locationId: string | null;
  providerAccountId: string;
  conversationId: string;
  routeId?: string | null;
}): Promise<{
  routeId: string;
  replyTo: string;
  replyRoutingTokenHash: string;
} | null> {
  const [route] = await db
    .select({
      id: inboxRoute.id,
      inboundAddress: inboxRoute.inboundAddressNormalized,
    })
    .from(inboxRoute)
    .where(
      and(
        input.routeId ? eq(inboxRoute.id, input.routeId) : undefined,
        eq(inboxRoute.organizationId, input.organizationId),
        input.locationId
          ? eq(inboxRoute.locationId, input.locationId)
          : isNull(inboxRoute.locationId),
        eq(inboxRoute.providerAccountId, input.providerAccountId),
        eq(inboxRoute.channel, "EMAIL"),
        eq(inboxRoute.isActive, true),
        input.routeId ? undefined : eq(inboxRoute.isDefault, true),
      ),
    )
    .orderBy(desc(inboxRoute.isDefault), desc(inboxRoute.createdAt))
    .limit(1);
  if (!route) return null;

  const secret = getInboxReplyRoutingSecret();
  const replyRoutingToken = createConversationReplyToken({
    conversationId: input.conversationId,
    secret,
  });
  return {
    routeId: route.id,
    replyRoutingTokenHash: hashConversationReplyToken(replyRoutingToken),
    replyTo: buildConversationReplyAddress({
      inboundAddress: route.inboundAddress,
      conversationId: input.conversationId,
      secret,
    }),
  };
}
