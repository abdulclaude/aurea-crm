import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { apps, credential as credentialTable } from "@/db/schema";
import { AppProvider, CredentialType } from "@/db/enums";
import { decrypt, encrypt } from "@/lib/encryption";

export type MindbodyApp = typeof apps.$inferSelect;

export interface MindbodyConfig {
  siteId: string;
  apiKey: string;
  accessToken: string;
  expiresAt: Date;
  username: string;
  password: string;
}

type MindbodyAppScope = Pick<
  MindbodyApp,
  "id" | "organizationId" | "locationId"
>;

const mindbodyCredentialSchema = z.object({
  apiKey: z.string().min(1),
  siteId: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

const mindbodyTokenSchema = z.object({
  AccessToken: z.string().min(1),
  RefreshToken: z.string().min(1).optional(),
  ExpiresIn: z.coerce.number().positive().optional(),
});

export interface MindbodyClient {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  MobilePhone: string;
  CreationDate: string;
  LastModifiedDateTime: string;
  Status: string;
}

export interface MindbodyClass {
  Id: number;
  ClassDescription: {
    Id: number;
    Name: string;
    Description: string;
  };
  Staff: {
    Id: number;
    Name: string;
  };
  Location: {
    Id: number;
    Name: string;
  };
  StartDateTime: string;
  EndDateTime: string;
  MaxCapacity: number;
  TotalBooked: number;
  Active: boolean;
}

export interface MindbodyAppointment {
  Id: number;
  ClassId: number;
  Client: {
    Id: string;
  };
  Status: string;
  BookedDateTime: string;
  StartDateTime: string;
  Notes: string;
}

export interface MindbodyClientContract {
  Id: number;
  Name: string;
  ContractName: string;
  StartDate: string;
  EndDate: string;
  AgreementDate: string;
  RemainingSessionCount: number;
  OriginationLocationId: number;
}

export class MindbodyAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "MindbodyAPIError";
  }
}

export class MindbodyAPI {
  private baseUrl = "https://api.mindbodyonline.com/public/v6";
  private config: MindbodyConfig;
  private appScope: MindbodyAppScope;

  constructor(config: MindbodyConfig, appScope: MindbodyAppScope) {
    this.config = config;
    this.appScope = appScope;
  }

  /**
   * Make an authenticated request to the Mindbody API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Check if token is expired and refresh if needed
    if (new Date() >= this.config.expiresAt) {
      console.log('[Mindbody API] Token expired, refreshing...');
      await this.refreshAccessToken();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "Api-Key": this.config.apiKey,
      Authorization: `Bearer ${this.config.accessToken}`,
      "SiteId": this.config.siteId,
      ...options.headers,
    };

    console.log('[Mindbody API] Making request:', {
      url,
      method: options.method || 'GET',
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Mindbody API] Request failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new MindbodyAPIError(
        `Mindbody API error: ${response.statusText}`,
        response.status,
        errorData,
      );
    }

    return response.json();
  }

  /**
   * Refresh the access token by reissuing with username/password
   */
  private async refreshAccessToken(): Promise<void> {
    console.log('[Mindbody API] Attempting to refresh access token...');

    if (!this.config.password) {
      console.error('[Mindbody API] Cannot refresh token - password not stored. User needs to reconnect.');
      throw new MindbodyAPIError(
        "Token expired. Please reconnect your Mindbody account.",
        401,
      );
    }

    const tokenUrl = "https://api.mindbodyonline.com/public/v6/usertoken/issue";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": this.config.apiKey,
        "SiteId": this.config.siteId,
      },
      body: JSON.stringify({
        Username: this.config.username,
        Password: this.config.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Mindbody API] Token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new MindbodyAPIError(
        "Failed to refresh Mindbody access token",
        response.status,
      );
    }

    console.log('[Mindbody API] Token refreshed successfully');

    const data = mindbodyTokenSchema.parse(await response.json());

    // Update config
    this.config.accessToken = data.AccessToken;
    this.config.expiresAt = new Date(
      Date.now() + Math.max(data.ExpiresIn ?? 3600, 60) * 1000,
    );

    const [updated] = await db
      .update(apps)
      .set({
        accessToken: encrypt(data.AccessToken),
        ...(data.RefreshToken
          ? { refreshToken: encrypt(data.RefreshToken) }
          : {}),
        expiresAt: this.config.expiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(apps.id, this.appScope.id),
          eq(apps.organizationId, this.appScope.organizationId),
          this.appScope.locationId
            ? eq(apps.locationId, this.appScope.locationId)
            : isNull(apps.locationId),
          eq(apps.provider, AppProvider.MINDBODY),
        ),
      )
      .returning({ id: apps.id });

    if (!updated) {
      throw new MindbodyAPIError(
        "Mindbody connection scope changed. Please reconnect the account.",
        409,
      );
    }
  }

  /**
   * Get clients from Mindbody
   */
  async getClients(options?: {
    limit?: number;
    offset?: number;
    updatedAfter?: Date;
  }): Promise<{ Clients: MindbodyClient[]; PaginationResponse: { TotalResults: number } }> {
    const params = new URLSearchParams({
      limit: String(options?.limit ?? 100),
      offset: String(options?.offset ?? 0),
    });

    if (options?.updatedAfter) {
      params.append(
        "lastModifiedDate",
        options.updatedAfter.toISOString(),
      );
    }

    return this.request(`/client/clients?${params.toString()}`);
  }

  /**
   * Get classes from Mindbody
   */
  async getClasses(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ Classes: MindbodyClass[]; PaginationResponse: { TotalResults: number } }> {
    const params = new URLSearchParams({
      limit: String(options?.limit ?? 100),
      offset: String(options?.offset ?? 0),
    });

    if (options?.startDate) {
      params.append("startDateTime", options.startDate.toISOString());
    }

    if (options?.endDate) {
      params.append("endDateTime", options.endDate.toISOString());
    }

    console.log('[Mindbody API] Calling getClasses with params:', {
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
    });

    const response = await this.request<{ Classes: MindbodyClass[]; PaginationResponse: { TotalResults: number } }>(`/class/classes?${params.toString()}`);

    console.log('[Mindbody API] getClasses response:', {
      classCount: response.Classes?.length ?? 0,
      totalResults: response.PaginationResponse?.TotalResults,
    });

    return response;
  }

  /**
   * Get class visits (bookings/appointments) from Mindbody
   */
  async getClassVisits(options?: {
    startDate?: Date;
    endDate?: Date;
    clientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ Visits: MindbodyAppointment[]; PaginationResponse: { TotalResults: number } }> {
    const params = new URLSearchParams({
      limit: String(options?.limit ?? 100),
      offset: String(options?.offset ?? 0),
    });

    if (options?.startDate) {
      params.append("startDate", options.startDate.toISOString());
    }

    if (options?.endDate) {
      params.append("endDate", options.endDate.toISOString());
    }

    if (options?.clientId) {
      params.append("clientId", options.clientId);
    }

    return this.request(`/class/classvisits?${params.toString()}`);
  }

  /**
   * Get client contracts (memberships) from Mindbody
   */
  async getClientContracts(
    clientId: string,
  ): Promise<{ Contracts: MindbodyClientContract[] }> {
    return this.request(`/client/clientcontracts?clientId=${clientId}`);
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<{ Client: MindbodyClient }> {
    return this.request(`/client/clients?clientIds=${clientId}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getClasses({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a Mindbody API instance from an Apps record
 */
export async function createMindbodyAPI(
  app: MindbodyApp,
): Promise<MindbodyAPI> {
  if (app.provider !== AppProvider.MINDBODY || !app.accessToken) {
    throw new MindbodyAPIError("Missing Mindbody access token");
  }

  const metadata = getMetadata(app.metadata);
  const credentialId = typeof metadata.credentialId === "string" ? metadata.credentialId : undefined;

  if (!credentialId) {
    throw new MindbodyAPIError("Missing credential ID in app metadata. Please reconnect your Mindbody account.");
  }

  const credential = await db.query.credential.findFirst({
    where: and(
      eq(credentialTable.id, credentialId),
      eq(credentialTable.organizationId, app.organizationId),
      app.locationId
        ? eq(credentialTable.locationId, app.locationId)
        : isNull(credentialTable.locationId),
      eq(credentialTable.type, CredentialType.MINDBODY),
      eq(credentialTable.isActive, true),
    ),
    columns: { value: true },
  });

  if (!credential) {
    throw new MindbodyAPIError("Mindbody credential not found. Please reconnect your Mindbody account.");
  }

  let credentialData: z.infer<typeof mindbodyCredentialSchema>;
  let accessToken: string;

  try {
    credentialData = mindbodyCredentialSchema.parse(
      JSON.parse(decrypt(credential.value)),
    );
    accessToken = decrypt(app.accessToken);
  } catch {
    throw new MindbodyAPIError("Failed to decrypt Mindbody credentials. Please reconnect your account.");
  }

  const config: MindbodyConfig = {
    siteId: credentialData.siteId,
    apiKey: credentialData.apiKey,
    username: credentialData.username,
    password: credentialData.password,
    accessToken,
    expiresAt: app.expiresAt ?? new Date(),
  };

  return new MindbodyAPI(config, {
    id: app.id,
    organizationId: app.organizationId,
    locationId: app.locationId,
  });
}

function getMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}
