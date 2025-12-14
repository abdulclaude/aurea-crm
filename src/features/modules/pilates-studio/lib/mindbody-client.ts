/**
 * Mindbody API Client
 *
 * Handles all communication with Mindbody's Public API
 * Documentation: https://developers.mindbodyonline.com/PublicDocumentation/V6
 */

interface MindbodyConfig {
  apiKey: string;
  siteId: string;
}

interface MindbodyClient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  mobilePhone?: string;
  homePhone?: string;
  membershipStatus?: string;
  createdDate?: string;
  lastModifiedDate?: string;
}

interface MindbodyClass {
  id: number;
  name: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  staff?: {
    id: number;
    name: string;
  };
  location?: {
    id: number;
    name: string;
  };
  maxCapacity?: number;
  totalBooked?: number;
}

interface MindbodyVisit {
  id: number;
  classId: number;
  clientId: string;
  visitDate: string;
  signedIn: boolean;
  makeUp: boolean;
  service: {
    id: number;
    name: string;
  };
}

const MINDBODY_API_BASE = "https://api.mindbodyonline.com/public/v6";

interface StaffTokenResponse {
  AccessToken: string;
  RefreshToken?: string;
  TokenType: string;
  ExpiresIn: number;
}

export class MindbodyAPIClient {
  private apiKey: string;
  private siteId: string;
  private accessToken?: string;

  constructor(config: MindbodyConfig) {
    this.apiKey = config.apiKey;
    this.siteId = config.siteId;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${MINDBODY_API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Api-Key": this.apiKey,
      "SiteId": this.siteId,
      ...(options.headers as any),
    };

    // Add authorization header if we have an access token
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Mindbody API Error: ${response.status} - ${JSON.stringify(error)}`
      );
    }

    return response.json();
  }

  /**
   * Issue a staff token using username and password
   */
  async issueStaffToken(username: string, password: string): Promise<StaffTokenResponse> {
    const response = await this.request<StaffTokenResponse>("/usertoken/issue", {
      method: "POST",
      body: JSON.stringify({
        Username: username,
        Password: password,
      }),
    });

    // Store the token for future requests
    if (response.AccessToken) {
      this.setAccessToken(response.AccessToken);
    }

    return response;
  }

  /**
   * Get clients from Mindbody
   */
  async getClients(params?: {
    limit?: number;
    offset?: number;
    searchText?: string;
  }): Promise<{ Clients: MindbodyClient[]; PaginationResponse: any }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
    if (params?.searchText)
      queryParams.append("searchText", params.searchText);

    return this.request(`/client/clients?${queryParams.toString()}`);
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<{ Client: MindbodyClient }> {
    return this.request(`/client/clients/${clientId}`);
  }

  /**
   * Create a new client
   */
  async createClient(client: {
    firstName: string;
    lastName: string;
    email?: string;
    mobilePhone?: string;
  }): Promise<{ Client: MindbodyClient }> {
    return this.request("/client/addclient", {
      method: "POST",
      body: JSON.stringify(client),
    });
  }

  /**
   * Get classes from Mindbody
   */
  async getClasses(params?: {
    startDateTime?: string;
    endDateTime?: string;
    staffIds?: number[];
    limit?: number;
    offset?: number;
  }): Promise<{ Classes: MindbodyClass[]; PaginationResponse: any }> {
    const queryParams = new URLSearchParams();
    if (params?.startDateTime)
      queryParams.append("StartDateTime", params.startDateTime);
    if (params?.endDateTime)
      queryParams.append("EndDateTime", params.endDateTime);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    return this.request(`/class/classes?${queryParams.toString()}`);
  }

  /**
   * Get class visits (bookings)
   */
  async getClassVisits(params: {
    startDate: string;
    endDate: string;
  }): Promise<{ Visits: MindbodyVisit[]; PaginationResponse: any }> {
    const queryParams = new URLSearchParams({
      StartDate: params.startDate,
      EndDate: params.endDate,
    });

    return this.request(`/class/classvisits?${queryParams.toString()}`);
  }

  /**
   * Add a client to a class
   */
  async addClientToClass(params: {
    clientId: string;
    classId: number;
  }): Promise<{ Visit: MindbodyVisit }> {
    return this.request("/class/addclienttoclass", {
      method: "POST",
      body: JSON.stringify({
        ClientId: params.clientId,
        ClassId: params.classId,
        SendEmail: true,
      }),
    });
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getClasses({ limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create a Mindbody client instance from stored credentials
 */
export function createMindbodyClient(config: MindbodyConfig): MindbodyAPIClient {
  return new MindbodyAPIClient(config);
}
