import prisma from "@/lib/db";
import {
  createMindbodyAPI,
  type MindbodyClient,
  type MindbodyClass,
  type MindbodyAppointment,
  type MindbodyClientContract,
} from "../lib/mindbody-api";
import type { Apps } from "@prisma/client";
import { StudioBookingStatus, StudioMembershipStatus } from "@prisma/client";

export interface SyncResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Sync clients from Mindbody to CRM Contacts
 */
export async function syncMindbodyClients(
  app: Apps,
  options?: {
    subaccountId?: string;
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
            subaccountId: options?.subaccountId,
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
    await prisma.apps.update({
      where: { id: app.id },
      data: {
        metadata: {
          ...(app.metadata as object),
          lastClientSync: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return result;
}

/**
 * Sync a single Mindbody client to a CRM contact
 */
async function syncClient(
  mindbodyClient: MindbodyClient,
  context: {
    subaccountId?: string;
    organizationId?: string;
  },
): Promise<void> {
  let organizationId = context.organizationId;
  const subaccountId = context.subaccountId;

  // If we have subaccountId, get the organizationId from it
  if (subaccountId && !organizationId) {
    const subaccount = await prisma.subaccount.findUnique({
      where: { id: subaccountId },
      select: { organizationId: true },
    });

    if (!subaccount) {
      throw new Error(`Subaccount ${subaccountId} not found`);
    }

    organizationId = subaccount.organizationId;
  }

  if (!organizationId) {
    throw new Error("Either organizationId or subaccountId is required");
  }

  // Try to find existing contact by email
  const existingContact = await prisma.contact.findFirst({
    where: {
      organizationId,
      subaccountId: subaccountId || null,
      email: mindbodyClient.Email,
    },
  });

  const contactData = {
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
    },
  };

  if (existingContact) {
    await prisma.contact.update({
      where: { id: existingContact.id },
      data: contactData,
    });
  } else {
    await prisma.contact.create({
      data: {
        id: crypto.randomUUID(),
        ...contactData,
        subaccountId: subaccountId || null,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Sync classes from Mindbody
 */
export async function syncMindbodyClasses(
  app: Apps,
  options?: {
    subaccountId?: string;
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
      subaccountId: options?.subaccountId,
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
          const subaccountId = options.subaccountId; // Optional

          const existing = await prisma.studioClass.findFirst({
            where: {
              organizationId,
              ...(subaccountId ? { subaccountId } : {}),
              externalId: String(mindbodyClass.Id),
            },
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
            },
          };

          if (existing) {
            console.log(`[Mindbody Classes Sync] Updating existing class ${existing.id}`);
            await prisma.studioClass.update({
              where: { id: existing.id },
              data: classData,
            });
            result.updated++;
          } else {
            console.log(`[Mindbody Classes Sync] Creating new class`);
            const created = await prisma.studioClass.create({
              data: {
                id: crypto.randomUUID(),
                ...classData,
                createdAt: new Date(),
                updatedAt: new Date(),
                organization: {
                  connect: { id: organizationId },
                },
                ...(subaccountId
                  ? {
                      subaccount: {
                        connect: { id: subaccountId },
                      },
                    }
                  : {}),
              },
            });
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
    await prisma.apps.update({
      where: { id: app.id },
      data: {
        metadata: {
          ...(app.metadata as object),
          lastClassSync: new Date().toISOString(),
        },
      },
    });

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
 * Sync bookings and memberships for a specific contact
 */
export async function syncClientBookingsAndMemberships(
  app: Apps,
  contactId: string,
  mindbodyClientId: string,
  options?: {
    subaccountId?: string;
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
        await syncBooking(visit, contactId, options?.subaccountId);
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
        await syncMembership(contract, contactId);
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
  contactId: string,
  subaccountId?: string,
): Promise<void> {
  // Find the corresponding class
  const studioClass = await prisma.studioClass.findFirst({
    where: {
      ...(subaccountId ? { subaccountId } : {}),
      externalId: String(visit.ClassId),
    },
  });

  if (!studioClass) {
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

  const existingBooking = await prisma.studioBooking.findFirst({
    where: {
      externalId: String(visit.Id),
    },
  });

  const bookingData = {
    status,
    bookedAt: new Date(visit.BookedDateTime),
    notes: visit.Notes,
    externalId: String(visit.Id),
    metadata: {
      startDateTime: visit.StartDateTime,
    },
  };

  if (existingBooking) {
    await prisma.studioBooking.update({
      where: { id: existingBooking.id },
      data: bookingData,
    });
  } else {
    await prisma.studioBooking.create({
      data: {
        id: crypto.randomUUID(),
        ...bookingData,
        classId: studioClass.id,
        contactId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Sync a single membership
 */
async function syncMembership(
  contract: MindbodyClientContract,
  contactId: string,
): Promise<void> {
  // Determine status based on dates
  const now = new Date();
  const endDate = new Date(contract.EndDate);
  const status: StudioMembershipStatus = endDate < now ? StudioMembershipStatus.EXPIRED : StudioMembershipStatus.ACTIVE;

  const existingMembership = await prisma.studioMembership.findFirst({
    where: {
      externalId: String(contract.Id),
    },
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
    },
  };

  if (existingMembership) {
    await prisma.studioMembership.update({
      where: { id: existingMembership.id },
      data: membershipData,
    });
  } else {
    await prisma.studioMembership.create({
      data: {
        id: crypto.randomUUID(),
        ...membershipData,
        contactId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Full sync - syncs clients, classes, and then bookings/memberships
 */
export async function fullMindbodySync(
  app: Apps,
  options?: {
    organizationId?: string;
    subaccountId?: string;
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

  // Step 3: Sync bookings and memberships for all contacts with Mindbody IDs
  const bookingsAndMembershipsResult: SyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  const allContacts = await prisma.contact.findMany({
    where: {
      organizationId: options?.organizationId,
      subaccountId: options?.subaccountId || null,
      source: "mindbody",
    },
    select: {
      id: true,
      metadata: true,
    },
  });

  for (const contact of allContacts) {
    const mindbodyId = (contact.metadata as any)?.mindbody?.id;
    if (!mindbodyId) continue;

    try {
      const result = await syncClientBookingsAndMemberships(
        app,
        contact.id,
        mindbodyId,
        { subaccountId: options?.subaccountId },
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
        `Failed to sync bookings/memberships for contact ${contact.id}: ${error instanceof Error ? error.message : String(error)}`,
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
