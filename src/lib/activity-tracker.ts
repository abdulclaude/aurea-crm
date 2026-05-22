"use server";

import { db } from "@/db";
import { session, user } from "@/db/schema";
import { and, desc, eq, gte, inArray } from "drizzle-orm";

type UserActivityStatus = {
  isOnline: boolean;
  lastActivityAt: Date | null;
  lastLoginAt: Date | null;
  status: string;
  statusMessage: string | null;
};

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

function isRecentlyActive(lastActivityAt: Date | null): boolean {
  return lastActivityAt
    ? Date.now() - lastActivityAt.getTime() < ONLINE_THRESHOLD_MS
    : false;
}

export async function updateSessionActivity(
  sessionToken: string
): Promise<void> {
  try {
    await db
      .update(session)
      .set({
        lastActivityAt: new Date(),
        isOnline: true,
      })
      .where(eq(session.token, sessionToken));
  } catch (error) {
    console.error("Failed to update session activity:", error);
  }
}

export async function markSessionOffline(sessionToken: string): Promise<void> {
  try {
    await db
      .update(session)
      .set({ isOnline: false })
      .where(eq(session.token, sessionToken));
  } catch (error) {
    console.error("Failed to mark session offline:", error);
  }
}

export async function getUserActivityStatus(
  userId: string
): Promise<Omit<UserActivityStatus, "status" | "statusMessage">> {
  const [latestSession] = await db
    .select({
      isOnline: session.isOnline,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gte(session.expiresAt, new Date())))
    .orderBy(desc(session.lastActivityAt))
    .limit(1);

  if (!latestSession) {
    return {
      isOnline: false,
      lastActivityAt: null,
      lastLoginAt: null,
    };
  }

  return {
    isOnline: latestSession.isOnline && isRecentlyActive(latestSession.lastActivityAt),
    lastActivityAt: latestSession.lastActivityAt,
    lastLoginAt: latestSession.createdAt,
  };
}

export async function getUsersActivityStatus(
  userIds: string[]
): Promise<Map<string, UserActivityStatus>> {
  const statusMap = new Map<string, UserActivityStatus>();

  if (userIds.length === 0) {
    return statusMap;
  }

  const activeSessions = await db
    .select({
      userId: session.userId,
      isOnline: session.isOnline,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      status: user.status,
      statusMessage: user.statusMessage,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(
      and(inArray(session.userId, userIds), gte(session.expiresAt, new Date()))
    )
    .orderBy(desc(session.lastActivityAt));

  for (const activeSession of activeSessions) {
    if (statusMap.has(activeSession.userId)) {
      continue;
    }

    statusMap.set(activeSession.userId, {
      isOnline:
        activeSession.isOnline && isRecentlyActive(activeSession.lastActivityAt),
      lastActivityAt: activeSession.lastActivityAt,
      lastLoginAt: activeSession.createdAt,
      status: activeSession.status,
      statusMessage: activeSession.statusMessage,
    });
  }

  const missingUserIds = userIds.filter((userId) => !statusMap.has(userId));
  const inactiveUsers =
    missingUserIds.length > 0
      ? await db
          .select({
            id: user.id,
            status: user.status,
            statusMessage: user.statusMessage,
          })
          .from(user)
          .where(inArray(user.id, missingUserIds))
      : [];

  const inactiveUserById = new Map(
    inactiveUsers.map((inactiveUser) => [inactiveUser.id, inactiveUser])
  );

  for (const userId of missingUserIds) {
    const inactiveUser = inactiveUserById.get(userId);
    statusMap.set(userId, {
      isOnline: false,
      lastActivityAt: null,
      lastLoginAt: new Date(0),
      status: inactiveUser?.status ?? "OFFLINE",
      statusMessage: inactiveUser?.statusMessage ?? null,
    });
  }

  return statusMap;
}
