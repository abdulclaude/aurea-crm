import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  apps as appsTable,
  client,
  location,
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
import { StudioBookingStatus, StudioMembershipStatus } from "@/db/enums";
import type { JsonObject } from "@/db/json";

export interface SyncResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Sync clients from Mindbody to CRM Clients
 */
export async function syncMindbodyClients(
  app: MindbodyApp,
  options?: {
    locationId?: string;
    organizationId?: string;
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
          await syncClient(mindbodyClient, {
            locationId: options?.locationId,
            organizationId: options?.organizationId,
          });
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
      .where(eq(appsTable.id, app.id));
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
  context: {
    locationId?: string;
    organizationId?: string;
  },
): Promise<void> {
  let organizationId = context.organizationId;
  const locationId = context.locationId;

  // If we have locationId, get the organizationId from it
  if (locationId && !organizationId) {
    const selectedLocation = await db.query.location.findFirst({
      where: eq(location.id, locationId),
      columns: { organizationId: true },
    });

    if (!selectedLocation) {
      throw new Error(`Location ${locationId} not found`);
    }

    organizationId = selectedLocation.organizationId;
  }

  if (!organizationId) {
    throw new Error("Either organizationId or locationId is required");
  }

  // Try to find existing client by email
  const existingClient = await db.query.client.findFirst({
    where: and(
      eq(client.organizationId, organizationId),
      locationId ? eq(client.locationId, locationId) : isNull(client.locationId),
      eq(client.email, mindbodyClient.Email),
    ),
  });

  const clientData = {
    name: `${mindbodyClient.FirstName} ${mindbodyClient.LastName}`,
    email: mindbodyClient.Email,
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
      .where(eq(client.id, existingClient.id));
  } else {
    await db.insert(client).values({
        id: crypto.randomUUID(),
        ...clientData,
        locationId: locationId || null,
        organizationId,
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
  options?: {
    locationId?: string;
    organizationId?: string;
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
    console.log('[Mindbody Classes Sync] Starting sync with options:', {
      locationId: options?.locationId,
      organizationId: options?.organizationId,
      startDate: options?.startDate,
      endDate: options?.endDate,
    });

    // Validate that we have at least an organizationId
    if (!options?.organizationId) {
      throw new Error('organizationId is required for syncing classes');
    }

    const api = await createMindbodyAPI(app);
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    // Default to next 30 days if no date range specified
    const startDate = options?.startDate ?? new Date();
    const endDate =
      options?.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    console.log('[Mindbody Classes Sync] Date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    while (hasMore) {
      console.log(`[Mindbody Classes Sync] Fetching batch with offset ${offset}...`);

      const response = await api.getClasses({
        startDate,
        endDate,
        limit,
        offset,
      });

      console.log(`[Mindbody Classes Sync] API Response:`, {
        classesLength: response.Classes?.length || 0,
        totalResults: response.PaginationResponse?.TotalResults,
        offset,
        limit,
      });

      if (!response.Classes || response.Classes.length === 0) {
        console.log('[Mindbody Classes Sync] No classes returned from API');
        hasMore = false;
        break;
      }

      for (const mindbodyClass of response.Classes) {
        try {
          console.log(`[Mindbody Classes Sync] Processing class:`, {
            id: mindbodyClass.Id,
            name: mindbodyClass.ClassDescription?.Name,
            startTime: mindbodyClass.StartDateTime,
          });

          const organizationId = options.organizationId; // Required
          const locationId = options.locationId; // Optional

          const existing = await db.query.studioClass.findFirst({
            where: and(
              eq(studioClass.organizationId, organizationId),
              locationId ? eq(studioClass.locationId, locationId) : undefined,
              eq(studioClass.externalId, String(mindbodyClass.Id)),
            ),
          });

          console.log(`[Mindbody Classes Sync] Existing class found:`, !!existing);

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
            console.log(`[Mindbody Classes Sync] Updating existing class ${existing.id}`);
            await db
              .update(studioClass)
              .set({ ...classData, updatedAt: new Date() })
              .where(eq(studioClass.id, existing.id));
            result.updated++;
          } else {
            console.log(`[Mindbody Classes Sync] Creating new class`);
            const [created] = await db
              .insert(studioClass)
              .values({
                id: crypto.randomUUID(),
                ...classData,
                createdAt: new Date(),
                updatedAt: new Date(),
                organizationId,
                locationId,
              })
              .returning();
            console.log(`[Mindbody Classes Sync] Created class with ID: ${created.id}`);
            result.created++;
          }

          result.synced++;
        } catch (error) {
          console.error(`[Mindbody Classes Sync] Error syncing class ${mindbodyClass.Id}:`, error);
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
      .where(eq(appsTable.id, app.id));

    console.log('[Mindbody Classes Sync] Sync completed successfully:', {
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      errors: result.errors.length,
    });
  } catch (error) {
    console.error('[Mindbody Classes Sync] Sync failed with error:', error);
    result.success = false;
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log('[Mindbody Classes Sync] Final result:', result);
  return result;
}

/**
 * Sync bookings and memberships for a specific client
 */
export async function syncClientBookingsAndMemberships(
  app: MindbodyApp,
  clientId: string,
  mindbodyClientId: string,
  options?: {
    locationId?: string;
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
    const api = await createMindbodyAPI(app);

    // Sync bookings (class visits)
    const visitsResponse = await api.getClassVisits({
      clientId: mindbodyClientId,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
    });

    for (const visit of visitsResponse.Visits) {
      try {
        await syncBooking(visit, clientId, options?.locationId);
        result.synced++;
      } catch (error) {
        result.errors.push(
          `Failed to sync booking ${visit.Id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Sync memberships (contracts)
    const contractsResponse = await api.getClientContracts(mindbodyClientId);

    for (const contract of contractsResponse.Contracts) {
      try {
        await syncMembership(contract, clientId);
        result.synced++;
      } catch (error) {
        result.errors.push(
          `Failed to sync membership ${contract.Id}: ${error instanceof Error ? error.message : String(error)}`,
        );
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
  locationId?: string,
): Promise<void> {
  // Find the corresponding class
  const selectedClass = await db.query.studioClass.findFirst({
    where: and(
      locationId ? eq(studioClass.locationId, locationId) : undefined,
      eq(studioClass.externalId, String(visit.ClassId)),
    ),
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

  const existingBooking = await db.query.studioBooking.findFirst({
    where: eq(studioBooking.externalId, String(visit.Id)),
  });

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
      .where(eq(studioBooking.id, existingBooking.id));
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
): Promise<void> {
  // Determine status based on dates
  const now = new Date();
  const endDate = new Date(contract.EndDate);
  const status: StudioMembershipStatus = endDate < now ? StudioMembershipStatus.EXPIRED : StudioMembershipStatus.ACTIVE;

  const existingMembership = await db.query.studioMembership.findFirst({
    where: eq(studioMembership.externalId, String(contract.Id)),
  });

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
    await db
      .update(studioMembership)
      .set({ ...membershipData, updatedAt: new Date() })
      .where(eq(studioMembership.id, existingMembership.id));
  } else {
    await db.insert(studioMembership).values({
        id: crypto.randomUUID(),
        ...membershipData,
        clientId,
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
  options?: {
    organizationId?: string;
    locationId?: string;
  },
): Promise<{
  clients: SyncResult;
  classes: SyncResult;
  bookingsAndMemberships: SyncResult;
}> {
  // Step 1: Sync clients
  const clientsResult = await syncMindbodyClients(app, options);

  // Step 2: Sync classes
  const classesResult = await syncMindbodyClasses(app, options);

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
      options?.organizationId
        ? eq(client.organizationId, options.organizationId)
        : undefined,
      options?.locationId ? eq(client.locationId, options.locationId) : isNull(client.locationId),
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
        { locationId: options?.locationId },
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
