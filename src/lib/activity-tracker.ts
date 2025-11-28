"use server";

import prisma from "@/lib/db";

/**
 * Updates the session's last activity timestamp
 * Should be called on each authenticated request
 */
export async function updateSessionActivity(sessionToken: string) {
  try {
    await prisma.session.update({
      where: { token: sessionToken },
      data: {
        lastActivityAt: new Date(),
        isOnline: true,
      },
    });
  } catch (error) {
    // Silently fail - don't block the request if activity tracking fails
    console.error("Failed to update session activity:", error);
  }
}

/**
 * Marks a session as offline
 */
export async function markSessionOffline(sessionToken: string) {
  try {
    await prisma.session.update({
      where: { token: sessionToken },
      data: {
        isOnline: false,
      },
    });
  } catch (error) {
    console.error("Failed to mark session offline:", error);
  }
}

/**
 * Gets the user's activity status across all their sessions
 */
export async function getUserActivityStatus(userId: string) {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gte: new Date() }, // Only active sessions
    },
    orderBy: { lastActivityAt: "desc" },
    take: 1,
  });

  if (sessions.length === 0) {
    return {
      isOnline: false,
      lastActivityAt: null,
      lastLoginAt: null,
    };
  }

  const latestSession = sessions[0];
  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const isRecentlyActive = latestSession.lastActivityAt
    ? Date.now() - latestSession.lastActivityAt.getTime() < ONLINE_THRESHOLD_MS
    : false;

  return {
    isOnline: latestSession.isOnline && isRecentlyActive,
    lastActivityAt: latestSession.lastActivityAt,
    lastLoginAt: latestSession.createdAt,
  };
}

/**
 * Get activity status for multiple users (for data tables)
 */
export async function getUsersActivityStatus(userIds: string[]) {
  // Fetch sessions with user info to get status
  const sessions = await prisma.session.findMany({
    where: {
      userId: { in: userIds },
      expiresAt: { gte: new Date() },
    },
    include: {
      user: {
        select: {
          status: true,
          statusMessage: true,
        },
      },
    },
    orderBy: { lastActivityAt: "desc" },
    distinct: ["userId"],
  });

  const statusMap = new Map<string, {
    isOnline: boolean;
    lastActivityAt: Date | null;
    lastLoginAt: Date;
    status: string;
    statusMessage: string | null;
  }>();

  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  for (const session of sessions) {
    const isRecentlyActive = session.lastActivityAt
      ? Date.now() - session.lastActivityAt.getTime() < ONLINE_THRESHOLD_MS
      : false;

    statusMap.set(session.userId, {
      isOnline: session.isOnline && isRecentlyActive,
      lastActivityAt: session.lastActivityAt,
      lastLoginAt: session.createdAt,
      status: session.user.status,
      statusMessage: session.user.statusMessage,
    });
  }

  // Fill in users without active sessions
  for (const userId of userIds) {
    if (!statusMap.has(userId)) {
      // Fetch user status even if they don't have an active session
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, statusMessage: true },
      });

      statusMap.set(userId, {
        isOnline: false,
        lastActivityAt: null,
        lastLoginAt: new Date(0), // Epoch time for users who never logged in
        status: user?.status || "OFFLINE",
        statusMessage: user?.statusMessage || null,
      });
    }
  }

  return statusMap;
}
