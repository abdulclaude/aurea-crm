import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apps as appsTable,
  client,
  studioBooking,
  studioClass,
  studioMembership,
} from "@/db/schema";
import {
  createMindbodyAPI,
  type MindbodyApp,
  type MindbodyClient,
  type MindbodyClass,
  type MindbodyAppointment,
  type MindbodyClientContract,
} from "../lib/mindbody-api";
import {
  AppProvider,
  StudioBookingStatus,
  StudioMembershipStatus,
} from "@/db/enums";
import type { JsonObject } from "@/db/json";
import {
  assertMindbodySyncScope,
  type MindbodySyncScope,
} from "./mindbody-sync-scope";

export interface SyncResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

type RequestedMindbodySyncScope = {
  locationId?: string | null;
  organizationId?: string;
};

async function resolveMindbodySyncScope(
  app: MindbodyApp,
  requestedScope?: RequestedMindbodySyncScope,
): Promise<MindbodySyncScope> {
  const scope = assertMindbodySyncScope(
    {
      organizationId: app.organizationId,
      locationId: app.locationId,
    },
    requestedScope,
  );

  const connectedApp = await db.query.apps.findFirst({
    where: and(
      eq(appsTable.id, app.id),
      eq(appsTable.organizationId, scope.organizationId),
      scope.locationId
        ? eq(appsTable.locationId, scope.locationId)
        : isNull(appsTable.locationId),
      eq(appsTable.provider, AppProvider.MINDBODY),
    ),
    columns: { id: true },
  });

  if (!connectedApp) {
    throw new Error(
      "Mindbody connection is not valid for this organization and location",
    );
  }

  return scope;
}

function mindbodyAppScopeWhere(app: MindbodyApp, scope: MindbodySyncScope) {
  return and(
    eq(appsTable.id, app.id),
    eq(appsTable.organizationId, scope.organizationId),
    scope.locationId
      ? eq(appsTable.locationId, scope.locationId)
      : isNull(appsTable.locationId),
    eq(appsTable.provider, AppProvider.MINDBODY),
  );
}

/**
 * Sync clients from Mindbody to CRM Clients
 */
export async function syncMindbodyClients(
  app: MindbodyApp,
  options?: RequestedMindbodySyncScope & {
    updatedAfter?: Date;
  },
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    const scope = await resolveMindbodySyncScope(app, options);
    const api = await createMindbodyAPI(app);
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await api.getClients({
        limit,
        offset,
        updatedAfter: options?.updatedAfter,
      });

      for (const mindbodyClient of response.Clients) {
        try {
          await syncClient(mindbodyClient, scope);
          result.synced++;
        } catch (error) {
          result.errors.push(
            `Failed to sync client ${mindbodyClient.Id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          result.success = false;
        }
      }

      offset += limit;
      hasMore = response.Clients.length === limit;
    }

    // Update last sync time
    await db
      .update(appsTable)
      .set({
        metadata: {
          ...(isJsonObject(app.metadata) ? app.metadata : {}),
          lastClientSync: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(mindbodyAppScopeWhere(app, scope));
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return result;
}

/**
 * Sync a single Mindbody client to a CRM client
 */
async function syncClient(
  mindbodyClient: MindbodyClient,
  scope: MindbodySyncScope,
): Promise<void> {
  const normalizedEmail = mindbodyClient.Email.trim();
  const candidates = await db.query.client.findMany({
    where: and(
      eq(client.organizationId, scope.organizationId),
      scope.locationId
        ? eq(client.locationId, scope.locationId)
        : isNull(client.locationId),
      or(
        eq(client.mindbodyId, mindbodyClient.Id),
        sql`${client.metadata} -> 'mindbody' ->> 'id' = ${mindbodyClient.Id}`,
        normalizedEmail ? eq(client.email, normalizedEmail) : undefined,
      ),
    ),
    columns: { id: true, email: true, metadata: true, mindbodyId: true },
    limit: 3,
  });

  const externalMatches = candidates.filter(
    (candidate) =>
      candidate.mindbodyId === mindbodyClient.Id ||
      getMindbodyClientId(candidate.metadata) === mindbodyClient.Id,
  );
  const emailMatch = normalizedEmail
    ? candidates.find((candidate) => candidate.email === normalizedEmail)
    : undefined;

  if (
    externalMatches.length > 1 ||
    (externalMatches[0] &&
      emailMatch &&
      externalMatches[0].id !== emailMatch.id)
  ) {
    throw new Error(
      `Mindbody client ${mindbodyClient.Id} conflicts with an existing client identity`,
    );
  }

  const existingClient = externalMatches[0] ?? emailMatch;
  const existingMindbodyId = existingClient
    ? (existingClient.mindbodyId ??
      getMindbodyClientId(existingClient.metadata))
    : null;
  if (existingMindbodyId && existingMindbodyId !== mindbodyClient.Id) {
    throw new Error(
      `Email ${normalizedEmail} is already assigned to a different Mindbody client`,
    );
  }

  const clientData = {
    name: `${mindbodyClient.FirstName} ${mindbodyClient.LastName}`,
    email: normalizedEmail || null,
    phone: mindbodyClient.MobilePhone,
    source: "mindbody",
    metadata: {
      mindbody: {
        id: mindbodyClient.Id,
        status: mindbodyClient.Status,
        creationDate: mindbodyClient.CreationDate,
        lastModified: mindbodyClient.LastModifiedDateTime,
      },
    } satisfies JsonObject,
  };

  if (existingClient) {
    await db
      .update(client)
      .set({ ...clientData, updatedAt: new Date() })
      .where(
        and(
          eq(client.id, existingClient.id),
          eq(client.organizationId, scope.organizationId),
          scope.locationId
            ? eq(client.locationId, scope.locationId)
            : isNull(client.locationId),
        ),
      );
  } else {
    await db.insert(client).values({
      id: crypto.randomUUID(),
      ...clientData,
      locationId: scope.locationId,
      organizationId: scope.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Sync classes from Mindbody
 */
export async function syncMindbodyClasses(
  app: MindbodyApp,
  options?: RequestedMindbodySyncScope & {
    startDate?: Date;
    endDate?: Date;
  },
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    const scope = await resolveMindbodySyncScope(app, options);
    const api = await createMindbodyAPI(app);
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    // Default to next 30 days if no date range specified
    const startDate = options?.startDate ?? new Date();
    const endDate =
      options?.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    while (hasMore) {
      const response = await api.getClasses({
        startDate,
        endDate,
        limit,
        offset,
      });

      if (!response.Classes || response.Classes.length === 0) {
        hasMore = false;
        break;
      }

      for (const mindbodyClass of response.Classes) {
        try {
          const existing = await db.query.studioClass.findFirst({
            where: and(
              eq(studioClass.organizationId, scope.organizationId),
              scope.locationId
                ? eq(studioClass.locationId, scope.locationId)
                : isNull(studioClass.locationId),
              eq(studioClass.externalId, String(mindbodyClass.Id)),
            ),
            columns: { id: true },
          });

          const classData = {
            name: mindbodyClass.ClassDescription.Name,
            description: mindbodyClass.ClassDescription.Description,
            instructorName: mindbodyClass.Staff?.Name,
            location: mindbodyClass.Location?.Name,
            startTime: new Date(mindbodyClass.StartDateTime),
            endTime: new Date(mindbodyClass.EndDateTime),
            maxCapacity: mindbodyClass.MaxCapacity,
            bookedCount: mindbodyClass.TotalBooked,
            externalId: String(mindbodyClass.Id),
            metadata: {
              classDescriptionId: mindbodyClass.ClassDescription.Id,
              staffId: mindbodyClass.Staff?.Id,
              locationId: mindbodyClass.Location?.Id,
              active: mindbodyClass.Active,
            } satisfies JsonObject,
          };

          if (existing) {
            await db
              .update(studioClass)
              .set({ ...classData, updatedAt: new Date() })
              .where(
                and(
                  eq(studioClass.id, existing.id),
                  eq(studioClass.organizationId, scope.organizationId),
                  scope.locationId
                    ? eq(studioClass.locationId, scope.locationId)
                    : isNull(studioClass.locationId),
                  eq(studioClass.externalId, String(mindbodyClass.Id)),
                ),
              );
            result.updated++;
          } else {
            await db
              .insert(studioClass)
              .values({
                id: crypto.randomUUID(),
                ...classData,
                createdAt: new Date(),
                updatedAt: new Date(),
                organizationId: scope.organizationId,
                locationId: scope.locationId,
              });
            result.created++;
          }

          result.synced++;
        } catch (error) {
          result.errors.push(
            `Failed to sync class ${mindbodyClass.Id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          result.success = false;
        }
      }

      offset += limit;
      hasMore = response.Classes.length === limit;
    }

    // Update last sync time
    await db
      .update(appsTable)
      .set({
        metadata: {
          ...(isJsonObject(app.metadata) ? app.metadata : {}),
          lastClassSync: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(mindbodyAppScopeWhere(app, scope));

  } catch (error) {
    result.success = false;
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return result;
}

/**
 * Sync bookings and memberships for a specific client
 */
export async function syncClientBookingsAndMemberships(
  app: MindbodyApp,
  clientId: string,
  mindbodyClientId: string,
  options?: RequestedMindbodySyncScope,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    const scope = await resolveMindbodySyncScope(app, options);
    const scopedClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, clientId),
        eq(client.organizationId, scope.organizationId),
        scope.locationId
          ? eq(client.locationId, scope.locationId)
          : isNull(client.locationId),
      ),
      columns: { id: true, mindbodyId: true, metadata: true },
    });

    if (!scopedClient) {
      throw new Error("Client is not valid for this Mindbody connection");
    }

    const storedMindbodyId =
      scopedClient.mindbodyId ?? getMindbodyClientId(scopedClient.metadata);
    if (storedMindbodyId && storedMindbodyId !== mindbodyClientId) {
      throw new Error(
        "Client Mindbody identity does not match the requested sync",
      );
    }

    const api = await createMindbodyAPI(app);

    // Sync bookings (class visits)
    const visitsResponse = await api.getClassVisits({
      clientId: mindbodyClientId,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
    });

    for (const visit of visitsResponse.Visits) {
      try {
        await syncBooking(visit, scopedClient.id, mindbodyClientId, scope);
        result.synced++;
      } catch (error) {
        result.errors.push(
          `Failed to sync booking ${visit.Id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        result.success = false;
      }
    }

    // Sync memberships (contracts)
    const contractsResponse = await api.getClientContracts(mindbodyClientId);

    for (const contract of contractsResponse.Contracts) {
      try {
        await syncMembership(contract, scopedClient.id, scope);
        result.synced++;
      } catch (error) {
        result.errors.push(
          `Failed to sync membership ${contract.Id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        result.success = false;
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return result;
}

/**
 * Sync a single booking
 */
async function syncBooking(
  visit: MindbodyAppointment,
  clientId: string,
  mindbodyClientId: string,
  scope: MindbodySyncScope,
): Promise<void> {
  if (visit.Client.Id !== mindbodyClientId) {
    throw new Error(
      `Booking ${visit.Id} belongs to a different Mindbody client`,
    );
  }

  // Find the corresponding class
  const selectedClass = await db.query.studioClass.findFirst({
    where: and(
      eq(studioClass.organizationId, scope.organizationId),
      scope.locationId
        ? eq(studioClass.locationId, scope.locationId)
        : isNull(studioClass.locationId),
      eq(studioClass.externalId, String(visit.ClassId)),
    ),
    columns: { id: true },
  });

  if (!selectedClass) {
    throw new Error(`Class ${visit.ClassId} not found in database`);
  }

  // Map Mindbody status to our status
  const statusMap: Record<string, StudioBookingStatus> = {
    Booked: StudioBookingStatus.BOOKED,
    Completed: StudioBookingStatus.ATTENDED,
    Cancelled: StudioBookingStatus.CANCELLED,
    NoShow: StudioBookingStatus.NO_SHOW,
    LateCancelled: StudioBookingStatus.LATE_CANCEL,
  };

  const status = statusMap[visit.Status] ?? StudioBookingStatus.BOOKED;

  const [existingBooking] = await db
    .select({
      id: studioBooking.id,
      classId: studioBooking.classId,
      clientId: studioBooking.clientId,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
    .innerJoin(client, eq(client.id, studioBooking.clientId))
    .where(
      and(
        eq(studioBooking.externalId, String(visit.Id)),
        eq(studioClass.organizationId, scope.organizationId),
        scope.locationId
          ? eq(studioClass.locationId, scope.locationId)
          : isNull(studioClass.locationId),
        eq(client.organizationId, scope.organizationId),
        scope.locationId
          ? eq(client.locationId, scope.locationId)
          : isNull(client.locationId),
      ),
    )
    .limit(1);

  if (
    existingBooking &&
    (existingBooking.classId !== selectedClass.id ||
      existingBooking.clientId !== clientId)
  ) {
    throw new Error(
      `Booking external ID ${visit.Id} is already assigned within this location`,
    );
  }

  const bookingData = {
    status,
    bookedAt: new Date(visit.BookedDateTime),
    notes: visit.Notes,
    externalId: String(visit.Id),
    metadata: {
      startDateTime: visit.StartDateTime,
    } satisfies JsonObject,
  };

  if (existingBooking) {
    await db
      .update(studioBooking)
      .set({ ...bookingData, updatedAt: new Date() })
      .where(
        and(
          eq(studioBooking.id, existingBooking.id),
          eq(studioBooking.classId, selectedClass.id),
          eq(studioBooking.clientId, clientId),
          eq(studioBooking.externalId, String(visit.Id)),
        ),
      );
  } else {
    await db.insert(studioBooking).values({
      id: crypto.randomUUID(),
      ...bookingData,
      classId: selectedClass.id,
      clientId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Sync a single membership
 */
async function syncMembership(
  contract: MindbodyClientContract,
  clientId: string,
  scope: MindbodySyncScope,
): Promise<void> {
  // Determine status based on dates
  const now = new Date();
  const endDate = new Date(contract.EndDate);
  const status: StudioMembershipStatus =
    endDate < now
      ? StudioMembershipStatus.EXPIRED
      : StudioMembershipStatus.ACTIVE;

  const membershipCandidates = await db
    .select({
      id: studioMembership.id,
      clientId: studioMembership.clientId,
      organizationId: studioMembership.organizationId,
      locationId: studioMembership.locationId,
    })
    .from(studioMembership)
    .innerJoin(client, eq(client.id, studioMembership.clientId))
    .where(
      and(
        eq(studioMembership.externalId, String(contract.Id)),
        eq(client.organizationId, scope.organizationId),
        scope.locationId
          ? eq(client.locationId, scope.locationId)
          : isNull(client.locationId),
      ),
    )
    .limit(2);

  if (membershipCandidates.length > 1) {
    throw new Error(
      `Membership external ID ${contract.Id} is duplicated within this location`,
    );
  }

  const existingMembership = membershipCandidates[0];

  if (existingMembership && existingMembership.clientId !== clientId) {
    throw new Error(
      `Membership external ID ${contract.Id} is already assigned within this location`,
    );
  }
  if (
    existingMembership?.organizationId &&
    existingMembership.organizationId !== scope.organizationId
  ) {
    throw new Error(
      `Membership external ID ${contract.Id} has conflicting organization ownership`,
    );
  }
  if (
    existingMembership?.locationId &&
    existingMembership.locationId !== scope.locationId
  ) {
    throw new Error(
      `Membership external ID ${contract.Id} has conflicting location ownership`,
    );
  }

  const membershipData = {
    name: contract.ContractName || contract.Name,
    type: contract.Name,
    status,
    startDate: new Date(contract.StartDate),
    endDate: new Date(contract.EndDate),
    totalClasses: contract.RemainingSessionCount,
    usedClasses: 0, // We'd need to calculate this from visits
    externalId: String(contract.Id),
    metadata: {
      originationLocationId: contract.OriginationLocationId,
      agreementDate: contract.AgreementDate,
    } satisfies JsonObject,
  };

  if (existingMembership) {
    const [updatedMembership] = await db
      .update(studioMembership)
      .set({
        ...membershipData,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(studioMembership.id, existingMembership.id),
          eq(studioMembership.clientId, clientId),
          eq(studioMembership.externalId, String(contract.Id)),
          or(
            isNull(studioMembership.organizationId),
            eq(studioMembership.organizationId, scope.organizationId),
          ),
          scope.locationId
            ? or(
                isNull(studioMembership.locationId),
                eq(studioMembership.locationId, scope.locationId),
              )
            : isNull(studioMembership.locationId),
        ),
      )
      .returning({ id: studioMembership.id });

    if (!updatedMembership) {
      throw new Error(
        `Membership external ID ${contract.Id} changed ownership during sync`,
      );
    }
  } else {
    await db.insert(studioMembership).values({
      id: crypto.randomUUID(),
      ...membershipData,
      clientId,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Full sync - syncs clients, classes, and then bookings/memberships
 */
export async function fullMindbodySync(
  app: MindbodyApp,
  options?: RequestedMindbodySyncScope,
): Promise<{
  clients: SyncResult;
  classes: SyncResult;
  bookingsAndMemberships: SyncResult;
}> {
  const scope = await resolveMindbodySyncScope(app, options);

  // Step 1: Sync clients
  const clientsResult = await syncMindbodyClients(app, scope);

  // Step 2: Sync classes
  const classesResult = await syncMindbodyClasses(app, scope);

  // Step 3: Sync bookings and memberships for all clients with Mindbody IDs
  const bookingsAndMembershipsResult: SyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  const allClients = await db.query.client.findMany({
    where: and(
      eq(client.organizationId, scope.organizationId),
      scope.locationId
        ? eq(client.locationId, scope.locationId)
        : isNull(client.locationId),
      eq(client.source, "mindbody"),
    ),
    columns: { id: true, metadata: true },
  });

  for (const selectedClient of allClients) {
    const mindbodyId = getMindbodyClientId(selectedClient.metadata);
    if (!mindbodyId) continue;

    try {
      const result = await syncClientBookingsAndMemberships(
        app,
        selectedClient.id,
        mindbodyId,
        scope,
      );

      bookingsAndMembershipsResult.synced += result.synced;
      bookingsAndMembershipsResult.created += result.created;
      bookingsAndMembershipsResult.updated += result.updated;
      bookingsAndMembershipsResult.errors.push(...result.errors);

      if (!result.success) {
        bookingsAndMembershipsResult.success = false;
      }
    } catch (error) {
      bookingsAndMembershipsResult.errors.push(
        `Failed to sync bookings/memberships for client ${selectedClient.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      bookingsAndMembershipsResult.success = false;
    }
  }

  return {
    clients: clientsResult,
    classes: classesResult,
    bookingsAndMemberships: bookingsAndMembershipsResult,
  };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMindbodyClientId(metadata: unknown): string | null {
  if (!isJsonObject(metadata)) {
    return null;
  }
  const mindbody = metadata.mindbody;
  if (!isJsonObject(mindbody)) {
    return null;
  }
  const id = mindbody.id;
  return typeof id === "string" ? id : null;
}
