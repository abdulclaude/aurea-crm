# Custom Funnel SDK Architecture & Integration System

## Executive Summary

This document outlines a comprehensive SDK and integration system that allows custom-built funnels (like TTR) to seamlessly connect with Aurea CRM. The system enables full tracking, analytics, workflow integration, and CRM synchronization while maintaining the flexibility of custom code and dependencies (like framer-motion, Lenis, etc.).

**Key Goals:**
1. Drop-in SDK for any Next.js/React funnel
2. Automatic funnel registration in Aurea CRM
3. Full event tracking and analytics
4. Workflow triggers from funnel events
5. Contact/Deal creation from funnel interactions
6. Read-only funnel management (no editing of custom code)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Custom Funnel (TTR)                   │
│  - Next.js 16 with custom packages                     │
│  - framer-motion, Lenis, custom UI                     │
│  - Aurea SDK embedded via <Script>                     │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ Events, Tracking Data
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Aurea Tracking API (Edge)                  │
│  - /api/track/events (event ingestion)                 │
│  - /api/track/identify (user identification)           │
│  - /api/track/page (page view tracking)                │
│  - Rate limiting & validation                          │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Inngest Event Processing                   │
│  - Normalize & enrich events                           │
│  - Trigger workflows                                   │
│  - Update analytics                                    │
│  - Sync to CRM                                         │
│  - Forward to pixels (Meta, GA4, etc.)                 │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  Aurea CRM Dashboard                    │
│  - View funnel in Funnels list (read-only)             │
│  - Analytics dashboard                                 │
│  - Contact/Deal records from funnel                    │
│  - Workflow integration                                │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Aurea Tracking SDK

### 1.1 SDK Installation & Initialization

#### NPM Package: `@aurea/tracking-sdk`

```typescript
// packages/tracking-sdk/src/index.ts

export interface AureaSDKConfig {
  // Required
  apiKey: string;              // Funnel API key from Aurea
  funnelId: string;            // Unique funnel identifier
  
  // Optional
  apiUrl?: string;             // Default: https://app.aureacrm.com/api/track
  debug?: boolean;             // Enable console logging
  autoTrack?: {
    pageViews?: boolean;       // Default: true
    clicks?: boolean;          // Default: false
    forms?: boolean;           // Default: true
    scrollDepth?: boolean;     // Default: false
  };
  
  // Privacy
  respectDoNotTrack?: boolean; // Default: true
  anonymizeIp?: boolean;       // Default: true
  
  // Performance
  batchSize?: number;          // Default: 10 events
  batchInterval?: number;      // Default: 2000ms
}

class AureaSDK {
  private config: AureaSDKConfig;
  private sessionId: string;
  private anonymousId: string;
  private userId?: string;
  private eventQueue: TrackingEvent[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  constructor(config: AureaSDKConfig) {
    this.config = this.validateConfig(config);
    this.sessionId = this.getOrCreateSessionId();
    this.anonymousId = this.getOrCreateAnonymousId();
    
    if (this.config.autoTrack) {
      this.initializeAutoTracking();
    }
    
    this.startBatchTimer();
    this.trackPageLoad();
  }
  
  /**
   * Track a custom event
   */
  track(eventName: string, properties?: Record<string, any>, options?: TrackOptions): void {
    const event: TrackingEvent = {
      eventId: this.generateEventId(),
      eventName,
      properties: properties || {},
      context: this.buildContext(),
      timestamp: Date.now(),
      ...options,
    };
    
    this.enqueueEvent(event);
    
    if (this.config.debug) {
      console.log('[Aurea SDK] Event tracked:', event);
    }
  }
  
  /**
   * Identify a user
   */
  identify(userId: string, traits?: Record<string, any>): void {
    this.userId = userId;
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurea_user_id', userId);
      
      if (traits) {
        localStorage.setItem('aurea_user_traits', JSON.stringify(traits));
      }
    }
    
    // Send identify event
    this.track('user_identified', {
      userId,
      traits,
    });
  }
  
  /**
   * Track a page view
   */
  page(name?: string, properties?: Record<string, any>): void {
    this.track('page_view', {
      pageName: name || document.title,
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      pageSearch: window.location.search,
      referrer: document.referrer,
      ...properties,
    });
  }
  
  /**
   * Track a conversion event
   */
  conversion(data: ConversionData): void {
    this.track('conversion', {
      conversionType: data.type,
      revenue: data.revenue,
      currency: data.currency || 'USD',
      orderId: data.orderId,
      products: data.products,
      ...data.properties,
    });
    
    // Mark session as converted
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aurea_converted', 'true');
    }
  }
  
  /**
   * Track form submission
   */
  formSubmit(formId: string, formData: Record<string, any>): void {
    this.track('form_submit', {
      formId,
      formData: this.sanitizeFormData(formData),
    });
  }
  
  /**
   * Build event context (browser, device, UTM params, etc.)
   */
  private buildContext(): EventContext {
    const url = new URL(window.location.href);
    
    return {
      page: {
        url: window.location.href,
        path: window.location.pathname,
        search: window.location.search,
        title: document.title,
        referrer: document.referrer,
      },
      
      utm: {
        source: url.searchParams.get('utm_source') || undefined,
        medium: url.searchParams.get('utm_medium') || undefined,
        campaign: url.searchParams.get('utm_campaign') || undefined,
        term: url.searchParams.get('utm_term') || undefined,
        content: url.searchParams.get('utm_content') || undefined,
      },
      
      user: {
        userId: this.userId,
        anonymousId: this.anonymousId,
      },
      
      session: {
        sessionId: this.sessionId,
      },
      
      device: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      
      library: {
        name: '@aurea/tracking-sdk',
        version: SDK_VERSION,
      },
    };
  }
  
  /**
   * Auto-tracking initialization
   */
  private initializeAutoTracking(): void {
    // Page view tracking
    if (this.config.autoTrack?.pageViews) {
      // Track initial page load
      this.page();
      
      // Track SPA route changes
      this.trackRouteChanges();
    }
    
    // Form tracking
    if (this.config.autoTrack?.forms) {
      this.trackForms();
    }
    
    // Click tracking
    if (this.config.autoTrack?.clicks) {
      this.trackClicks();
    }
    
    // Scroll depth tracking
    if (this.config.autoTrack?.scrollDepth) {
      this.trackScrollDepth();
    }
  }
  
  /**
   * Send events to Aurea API
   */
  private async sendEvents(events: TrackingEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    try {
      const response = await fetch(`${this.config.apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Aurea-API-Key': this.config.apiKey,
          'X-Aurea-Funnel-ID': this.config.funnelId,
        },
        body: JSON.stringify({
          events,
          batch: true,
        }),
        // Use keepalive for events sent during page unload
        keepalive: true,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (this.config.debug) {
        console.log('[Aurea SDK] Events sent successfully:', events.length);
      }
    } catch (error) {
      console.error('[Aurea SDK] Failed to send events:', error);
      
      // Store failed events in localStorage for retry
      this.storeFailedEvents(events);
    }
  }
  
  /**
   * Batch event sending
   */
  private enqueueEvent(event: TrackingEvent): void {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= (this.config.batchSize || 10)) {
      this.flushEvents();
    }
  }
  
  private flushEvents(): void {
    if (this.eventQueue.length === 0) return;
    
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    
    this.sendEvents(eventsToSend);
  }
  
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.batchInterval || 2000);
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEvents();
      });
      
      // Also flush on visibility change (mobile)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flushEvents();
        }
      });
    }
  }
  
  // ... additional helper methods
}

export default AureaSDK;

// Singleton instance
let sdkInstance: AureaSDK | null = null;

export function init(config: AureaSDKConfig): AureaSDK {
  if (sdkInstance) {
    console.warn('[Aurea SDK] SDK already initialized');
    return sdkInstance;
  }
  
  sdkInstance = new AureaSDK(config);
  
  // Expose global instance
  if (typeof window !== 'undefined') {
    (window as any).aurea = sdkInstance;
  }
  
  return sdkInstance;
}

export function getInstance(): AureaSDK | null {
  return sdkInstance;
}
```

### 1.2 React Integration Utilities

```typescript
// packages/tracking-sdk/src/react.tsx

import { useEffect, useRef, useCallback } from 'react';
import { getInstance } from './index';

/**
 * React hook for tracking page views
 */
export function usePageTracking(pageName?: string, properties?: Record<string, any>) {
  useEffect(() => {
    const sdk = getInstance();
    if (sdk) {
      sdk.page(pageName, properties);
    }
  }, [pageName, properties]);
}

/**
 * React hook for tracking events
 */
export function useTrackEvent() {
  return useCallback((eventName: string, properties?: Record<string, any>) => {
    const sdk = getInstance();
    if (sdk) {
      sdk.track(eventName, properties);
    }
  }, []);
}

/**
 * Track component that fires an event when rendered
 */
interface TrackProps {
  event: string;
  properties?: Record<string, any>;
  once?: boolean;
}

export function Track({ event, properties, once = false }: TrackProps) {
  const tracked = useRef(false);
  
  useEffect(() => {
    if (once && tracked.current) return;
    
    const sdk = getInstance();
    if (sdk) {
      sdk.track(event, properties);
      tracked.current = true;
    }
  }, [event, properties, once]);
  
  return null;
}

/**
 * Trackable link component
 */
interface TrackableLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  eventName?: string;
  eventProperties?: Record<string, any>;
}

export function TrackableLink({ 
  eventName = 'link_clicked', 
  eventProperties,
  onClick,
  ...props 
}: TrackableLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const sdk = getInstance();
    if (sdk) {
      sdk.track(eventName, {
        href: props.href,
        text: props.children,
        ...eventProperties,
      });
    }
    
    onClick?.(e);
  };
  
  return <a {...props} onClick={handleClick} />;
}

/**
 * Trackable button component
 */
interface TrackableButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  eventName?: string;
  eventProperties?: Record<string, any>;
}

export function TrackableButton({ 
  eventName = 'button_clicked', 
  eventProperties,
  onClick,
  ...props 
}: TrackableButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const sdk = getInstance();
    if (sdk) {
      sdk.track(eventName, {
        buttonText: props.children,
        buttonId: props.id,
        ...eventProperties,
      });
    }
    
    onClick?.(e);
  };
  
  return <button {...props} onClick={handleClick} />;
}

/**
 * Form tracking wrapper
 */
interface TrackableFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  formId: string;
  trackSubmit?: boolean;
  trackFields?: boolean;
}

export function TrackableForm({ 
  formId,
  trackSubmit = true,
  trackFields = false,
  onSubmit,
  children,
  ...props 
}: TrackableFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (trackSubmit) {
      const sdk = getInstance();
      if (sdk) {
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        
        sdk.formSubmit(formId, data);
      }
    }
    
    onSubmit?.(e);
  };
  
  return (
    <form {...props} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
```

### 1.3 Integration with TTR Funnel

```typescript
// ttr/src/lib/aurea-tracking.ts

import { init } from '@aurea/tracking-sdk';

// Initialize Aurea SDK
export const aureaSDK = init({
  apiKey: process.env.NEXT_PUBLIC_AUREA_API_KEY!,
  funnelId: process.env.NEXT_PUBLIC_AUREA_FUNNEL_ID!,
  debug: process.env.NODE_ENV === 'development',
  
  autoTrack: {
    pageViews: true,
    forms: true,
    clicks: false,
    scrollDepth: true,
  },
  
  respectDoNotTrack: true,
  anonymizeIp: true,
});

// Helper functions for TTR-specific tracking
export const trackCheckoutInitiated = (productId: string, price: number) => {
  aureaSDK.track('checkout_initiated', {
    productId,
    price,
    currency: 'USD',
  });
};

export const trackPurchase = (orderId: string, amount: number, email: string) => {
  // Identify user
  aureaSDK.identify(email, {
    email,
    purchaseDate: new Date().toISOString(),
  });
  
  // Track conversion
  aureaSDK.conversion({
    type: 'purchase',
    orderId,
    revenue: amount,
    currency: 'USD',
    properties: {
      product: 'TTR Membership',
    },
  });
};

export const trackAbandonedCheckout = (sessionId: string) => {
  aureaSDK.track('checkout_abandoned', {
    sessionId,
    abandonedAt: new Date().toISOString(),
  });
};
```

```typescript
// ttr/src/components/buy-button.tsx (updated)

"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ComponentProps } from "react";
import { trackCheckoutInitiated } from "@/lib/aurea-tracking";

export function BuyButton({ children, ...props }: BuyButtonProps) {
  const whopUrl = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL || "https://whop.com/your-product";

  async function onClick() {
    // Track checkout initiation in Aurea
    trackCheckoutInitiated('ttr-membership', 99);
    
    // Original tracking
    fetch("/api/events/initiate-checkout", { method: "POST" }).catch(() => {});
    
    window.location.href = whopUrl;
  }

  // ... rest of component
}
```

```typescript
// ttr/src/app/api/webhooks/whop/route.ts (updated)

import { trackPurchase } from "@/lib/aurea-tracking";

export async function POST(request: NextRequest) {
  // ... existing webhook processing
  
  if (type === "payment.succeeded") {
    // Track purchase in Aurea
    if (email) {
      trackPurchase(
        data?.id || 'unknown',
        finalAmount ? finalAmount / 100 : 0,
        email
      );
    }
    
    // ... rest of existing code
  }
  
  // ... rest of webhook handler
}
```

---

## Part 2: Funnel Registration System

### 2.1 Database Schema Updates

```prisma
// prisma/schema.prisma

enum FunnelType {
  INTERNAL  // Built with Aurea funnel builder
  EXTERNAL  // Custom external funnel
}

model Funnel {
  // ... existing fields
  
  // New fields for external funnel support
  funnelType       FunnelType   @default(INTERNAL)
  isReadOnly       Boolean      @default(false)
  
  // External funnel metadata
  externalUrl      String?      // Primary domain
  externalDomains  String[]     // Additional domains
  apiKey           String?      @unique // For external funnel authentication
  
  // Tracking configuration
  trackingConfig   Json?        // SDK configuration
  
  // External funnel stats (cached)
  lastSyncedAt     DateTime?
  externalMetadata Json?        // Store custom metadata from external funnel
  
  // Relations
  externalEvents   FunnelEvent[]
}

model FunnelEvent {
  id               String       @id @default(cuid())
  
  // Core identifiers
  eventId          String       @unique // From SDK
  funnelId         String
  subaccountId     String?
  
  // Event data
  eventName        String
  eventProperties  Json         @default("{}")
  
  // Session & User
  sessionId        String
  userId           String?      // Identified user
  anonymousId      String?      // Anonymous visitor
  
  // Context
  pageUrl          String?
  pagePath         String?
  pageTitle        String?
  referrer         String?
  
  // UTM Parameters
  utmSource        String?
  utmMedium        String?
  utmCampaign      String?
  utmTerm          String?
  utmContent       String?
  
  // Device & Browser
  userAgent        String?
  deviceType       String?      // mobile, tablet, desktop
  browserName      String?
  browserVersion   String?
  osName           String?
  osVersion        String?
  screenWidth      Int?
  screenHeight     Int?
  
  // Geographic
  ipAddress        String?
  countryCode      String?
  region           String?
  city             String?
  timezone         String?
  
  // Conversion tracking
  isConversion     Boolean      @default(false)
  conversionType   String?
  revenue          Decimal?     @db.Decimal(10, 2)
  currency         String?
  orderId          String?
  
  // Timestamps
  timestamp        DateTime     // Client timestamp
  serverTimestamp  DateTime     @default(now())
  createdAt        DateTime     @default(now())
  
  // Relations
  funnel           Funnel       @relation(fields: [funnelId], references: [id], onDelete: Cascade)
  subaccount       Subaccount?  @relation(fields: [subaccountId], references: [id], onDelete: SetNull)
  
  @@index([funnelId, timestamp])
  @@index([sessionId])
  @@index([userId, timestamp])
  @@index([anonymousId])
  @@index([subaccountId, timestamp])
  @@index([eventName, funnelId])
  @@index([isConversion, funnelId])
}

model FunnelSession {
  id               String       @id @default(cuid())
  
  sessionId        String       @unique
  funnelId         String
  subaccountId     String?
  
  // User identification
  userId           String?
  anonymousId      String?
  
  // Session timing
  startedAt        DateTime
  endedAt          DateTime?
  durationSeconds  Int?
  
  // Attribution (first touch)
  firstSource      String?
  firstMedium      String?
  firstCampaign    String?
  firstReferrer    String?
  firstPageUrl     String?
  
  // Attribution (last touch)
  lastSource       String?
  lastMedium       String?
  lastCampaign     String?
  lastPageUrl      String?
  
  // Metrics
  pageViews        Int          @default(0)
  eventsCount      Int          @default(0)
  
  // Conversion
  converted        Boolean      @default(false)
  conversionValue  Decimal?     @db.Decimal(10, 2)
  conversionType   String?
  
  // Device & Location
  ipAddress        String?
  userAgent        String?
  deviceType       String?
  countryCode      String?
  city             String?
  
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  @@index([funnelId, startedAt])
  @@index([userId])
  @@index([subaccountId, startedAt])
  @@index([converted, funnelId])
}

// Enhanced funnel analytics
model FunnelAnalyticsSummary {
  id               String       @id @default(cuid())
  
  date             DateTime     @db.Date
  funnelId         String
  subaccountId     String?
  
  // Traffic source
  source           String?
  medium           String?
  campaign         String?
  
  // Traffic metrics
  sessions         Int          @default(0)
  uniqueVisitors   Int          @default(0)
  pageViews        Int          @default(0)
  bounceRate       Decimal?     @db.Decimal(5, 2)
  avgSessionDuration Int?
  
  // Conversion metrics
  conversions      Int          @default(0)
  conversionRate   Decimal?     @db.Decimal(5, 2)
  
  // Revenue metrics
  revenue          Decimal?     @db.Decimal(10, 2)
  avgOrderValue    Decimal?     @db.Decimal(10, 2)
  
  // Event counts by type
  checkouts        Int          @default(0)
  formSubmissions  Int          @default(0)
  buttonClicks     Int          @default(0)
  
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  @@unique([date, funnelId, source, medium, campaign])
  @@index([funnelId, date])
  @@index([subaccountId, date])
}
```

### 2.2 Funnel Registration API

```typescript
// src/features/external-funnels/server/external-funnels-router.ts

import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import db from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { generateApiKey } from "@/lib/encryption";
import { FunnelType } from "@prisma/client";

export const externalFunnelsRouter = createTRPCRouter({
  /**
   * Register a new external funnel
   */
  register: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        externalUrl: z.string().url(),
        additionalDomains: z.array(z.string().url()).optional(),
        trackingConfig: z.object({
          autoTrackPageViews: z.boolean().default(true),
          autoTrackForms: z.boolean().default(true),
          autoTrackClicks: z.boolean().default(false),
          autoTrackScrollDepth: z.boolean().default(false),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }
      
      // Generate unique API key for this funnel
      const apiKey = generateApiKey();
      
      const funnel = await db.funnel.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description,
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,
          
          // External funnel specific
          funnelType: FunnelType.EXTERNAL,
          isReadOnly: true,
          externalUrl: input.externalUrl,
          externalDomains: input.additionalDomains || [],
          apiKey,
          trackingConfig: input.trackingConfig || {},
          
          status: "PUBLISHED", // External funnels are always "published"
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      return {
        funnel,
        apiKey, // Return API key ONCE for user to store
      };
    }),
  
  /**
   * Update external funnel metadata
   */
  updateExternal: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        externalUrl: z.string().url().optional(),
        additionalDomains: z.array(z.string().url()).optional(),
        trackingConfig: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
          funnelType: FunnelType.EXTERNAL,
        },
      });
      
      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "External funnel not found",
        });
      }
      
      const updated = await db.funnel.update({
        where: { id: input.funnelId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.externalUrl && { externalUrl: input.externalUrl }),
          ...(input.additionalDomains && { externalDomains: input.additionalDomains }),
          ...(input.trackingConfig && { trackingConfig: input.trackingConfig }),
          updatedAt: new Date(),
        },
      });
      
      return updated;
    }),
  
  /**
   * Regenerate API key (in case of compromise)
   */
  regenerateApiKey: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          funnelType: FunnelType.EXTERNAL,
        },
      });
      
      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "External funnel not found",
        });
      }
      
      const newApiKey = generateApiKey();
      
      await db.funnel.update({
        where: { id: input.funnelId },
        data: { apiKey: newApiKey },
      });
      
      return { apiKey: newApiKey };
    }),
  
  /**
   * Get funnel with analytics summary
   */
  getWithAnalytics: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? null,
        },
      });
      
      if (!funnel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Funnel not found",
        });
      }
      
      // Get analytics summary
      const analytics = await db.funnelAnalyticsSummary.aggregate({
        where: {
          funnelId: input.funnelId,
          ...(input.dateFrom && input.dateTo && {
            date: {
              gte: input.dateFrom,
              lte: input.dateTo,
            },
          }),
        },
        _sum: {
          sessions: true,
          uniqueVisitors: true,
          pageViews: true,
          conversions: true,
          revenue: true,
        },
        _avg: {
          conversionRate: true,
          avgOrderValue: true,
          bounceRate: true,
        },
      });
      
      return {
        funnel,
        analytics: {
          totalSessions: analytics._sum.sessions || 0,
          totalVisitors: analytics._sum.uniqueVisitors || 0,
          totalPageViews: analytics._sum.pageViews || 0,
          totalConversions: analytics._sum.conversions || 0,
          totalRevenue: analytics._sum.revenue || 0,
          avgConversionRate: analytics._avg.conversionRate || 0,
          avgOrderValue: analytics._avg.avgOrderValue || 0,
          avgBounceRate: analytics._avg.bounceRate || 0,
        },
      };
    }),
});
```

---

## Part 3: Event Tracking API

### 3.1 API Routes for Event Ingestion

```typescript
// src/app/api/track/events/route.ts

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { inngest } from "@/inngest/client";
import { headers } from "next/headers";
import { z } from "zod";

const EventSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  properties: z.record(z.any()).optional(),
  context: z.object({
    page: z.object({
      url: z.string(),
      path: z.string(),
      title: z.string().optional(),
      referrer: z.string().optional(),
    }).optional(),
    utm: z.object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      term: z.string().optional(),
      content: z.string().optional(),
    }).optional(),
    user: z.object({
      userId: z.string().optional(),
      anonymousId: z.string().optional(),
    }).optional(),
    session: z.object({
      sessionId: z.string(),
    }),
    device: z.object({
      userAgent: z.string().optional(),
      screenWidth: z.number().optional(),
      screenHeight: z.number().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    }).optional(),
  }),
  timestamp: z.number(),
});

const BatchRequestSchema = z.object({
  events: z.array(EventSchema),
  batch: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    const headersList = headers();
    const apiKey = headersList.get('X-Aurea-API-Key');
    const funnelId = headersList.get('X-Aurea-Funnel-ID');
    
    if (!apiKey || !funnelId) {
      return NextResponse.json(
        { error: 'Missing API key or Funnel ID' },
        { status: 401 }
      );
    }
    
    // Verify funnel and API key
    const funnel = await db.funnel.findFirst({
      where: {
        id: funnelId,
        apiKey,
        funnelType: 'EXTERNAL',
      },
      select: {
        id: true,
        subaccountId: true,
        organizationId: true,
        trackingConfig: true,
      },
    });
    
    if (!funnel) {
      return NextResponse.json(
        { error: 'Invalid API key or Funnel ID' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const parsed = BatchRequestSchema.parse(body);
    
    // Get client IP for geo lookup
    const ip = req.ip || 
               headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    
    // Process events asynchronously via Inngest
    await inngest.send({
      name: 'tracking/events.batch',
      data: {
        funnelId: funnel.id,
        subaccountId: funnel.subaccountId,
        organizationId: funnel.organizationId,
        events: parsed.events,
        ipAddress: ip,
      },
    });
    
    return NextResponse.json({
      success: true,
      eventsReceived: parsed.events.length,
    });
    
  } catch (error) {
    console.error('[Tracking API] Error processing events:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID',
    },
  });
}
```

### 3.2 Inngest Event Processing

```typescript
// src/inngest/functions/process-tracking-events.ts

import { inngest } from "../client";
import db from "@/lib/db";
import { UAParser } from "ua-parser-js";
import { sendWorkflowExecution } from "../utils";

export const processTrackingEvents = inngest.createFunction(
  {
    id: "process-tracking-events",
    retries: 3,
  },
  { event: "tracking/events.batch" },
  async ({ event, step }) => {
    const { funnelId, subaccountId, organizationId, events, ipAddress } = event.data;
    
    // Step 1: Parse and enrich events
    const enrichedEvents = await step.run("enrich-events", async () => {
      return events.map((evt) => {
        const parser = new UAParser(evt.context.device?.userAgent);
        const device = parser.getResult();
        
        return {
          eventId: evt.eventId,
          funnelId,
          subaccountId,
          
          eventName: evt.eventName,
          eventProperties: evt.properties || {},
          
          sessionId: evt.context.session.sessionId,
          userId: evt.context.user?.userId,
          anonymousId: evt.context.user?.anonymousId,
          
          pageUrl: evt.context.page?.url,
          pagePath: evt.context.page?.path,
          pageTitle: evt.context.page?.title,
          referrer: evt.context.page?.referrer,
          
          utmSource: evt.context.utm?.source,
          utmMedium: evt.context.utm?.medium,
          utmCampaign: evt.context.utm?.campaign,
          utmTerm: evt.context.utm?.term,
          utmContent: evt.context.utm?.content,
          
          userAgent: evt.context.device?.userAgent,
          deviceType: device.device.type || 'desktop',
          browserName: device.browser.name,
          browserVersion: device.browser.version,
          osName: device.os.name,
          osVersion: device.os.version,
          screenWidth: evt.context.device?.screenWidth,
          screenHeight: evt.context.device?.screenHeight,
          
          ipAddress,
          timezone: evt.context.device?.timezone,
          
          isConversion: evt.eventName === 'conversion',
          conversionType: evt.properties?.conversionType,
          revenue: evt.properties?.revenue,
          currency: evt.properties?.currency,
          orderId: evt.properties?.orderId,
          
          timestamp: new Date(evt.timestamp),
          serverTimestamp: new Date(),
        };
      });
    });
    
    // Step 2: Store events in database
    await step.run("store-events", async () => {
      await db.funnelEvent.createMany({
        data: enrichedEvents,
        skipDuplicates: true, // Prevent duplicate eventIds
      });
    });
    
    // Step 3: Update or create sessions
    await step.run("update-sessions", async () => {
      const sessionIds = [...new Set(enrichedEvents.map(e => e.sessionId))];
      
      for (const sessionId of sessionIds) {
        const sessionEvents = enrichedEvents.filter(e => e.sessionId === sessionId);
        const firstEvent = sessionEvents[0];
        const lastEvent = sessionEvents[sessionEvents.length - 1];
        
        const hasConversion = sessionEvents.some(e => e.isConversion);
        const conversionEvent = sessionEvents.find(e => e.isConversion);
        
        await db.funnelSession.upsert({
          where: { sessionId },
          create: {
            sessionId,
            funnelId,
            subaccountId,
            userId: firstEvent.userId,
            anonymousId: firstEvent.anonymousId,
            
            startedAt: firstEvent.timestamp,
            endedAt: lastEvent.timestamp,
            
            firstSource: firstEvent.utmSource,
            firstMedium: firstEvent.utmMedium,
            firstCampaign: firstEvent.utmCampaign,
            firstReferrer: firstEvent.referrer,
            firstPageUrl: firstEvent.pageUrl,
            
            lastSource: lastEvent.utmSource,
            lastMedium: lastEvent.utmMedium,
            lastCampaign: lastEvent.utmCampaign,
            lastPageUrl: lastEvent.pageUrl,
            
            pageViews: sessionEvents.filter(e => e.eventName === 'page_view').length,
            eventsCount: sessionEvents.length,
            
            converted: hasConversion,
            conversionValue: conversionEvent?.revenue,
            conversionType: conversionEvent?.conversionType,
            
            ipAddress,
            userAgent: firstEvent.userAgent,
            deviceType: firstEvent.deviceType,
          },
          update: {
            endedAt: lastEvent.timestamp,
            durationSeconds: Math.floor(
              (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000
            ),
            
            lastSource: lastEvent.utmSource,
            lastMedium: lastEvent.utmMedium,
            lastCampaign: lastEvent.utmCampaign,
            lastPageUrl: lastEvent.pageUrl,
            
            pageViews: {
              increment: sessionEvents.filter(e => e.eventName === 'page_view').length,
            },
            eventsCount: {
              increment: sessionEvents.length,
            },
            
            ...(hasConversion && {
              converted: true,
              conversionValue: conversionEvent?.revenue,
              conversionType: conversionEvent?.conversionType,
            }),
          },
        });
      }
    });
    
    // Step 4: Trigger CRM actions for conversions
    const conversions = enrichedEvents.filter(e => e.isConversion);
    
    for (const conversion of conversions) {
      await step.run(`create-crm-contact-${conversion.eventId}`, async () => {
        // Only create contact if user is identified (has userId/email)
        if (!conversion.userId) return;
        
        // Check if contact already exists
        const existingContact = await db.contact.findFirst({
          where: {
            email: conversion.userId,
            subaccountId: subaccountId || null,
          },
        });
        
        if (existingContact) {
          // Update existing contact
          await db.contact.update({
            where: { id: existingContact.id },
            data: {
              lastInteractionAt: new Date(),
              score: {
                increment: 10, // Increase score for conversion
              },
              metadata: {
                ...(existingContact.metadata as any),
                lastFunnelConversion: {
                  funnelId,
                  date: new Date().toISOString(),
                  revenue: conversion.revenue,
                  type: conversion.conversionType,
                },
              },
            },
          });
        } else {
          // Create new contact
          await db.contact.create({
            data: {
              organizationId,
              subaccountId,
              email: conversion.userId,
              source: `funnel:${funnelId}`,
              lifecycleStage: 'CUSTOMER',
              score: 50, // Initial score for conversion
              metadata: {
                funnelConversion: {
                  funnelId,
                  date: new Date().toISOString(),
                  revenue: conversion.revenue,
                  type: conversion.conversionType,
                },
              },
            },
          });
        }
      });
      
      // Step 5: Trigger workflows for conversion events
      await step.run(`trigger-workflows-${conversion.eventId}`, async () => {
        // Find workflows with "Funnel Conversion" trigger
        const workflows = await db.workflow.findMany({
          where: {
            organizationId,
            subaccountId: subaccountId || null,
            isArchived: false,
            node: {
              some: {
                type: 'FUNNEL_CONVERSION_TRIGGER',
                data: {
                  path: ['funnelId'],
                  equals: funnelId,
                },
              },
            },
          },
        });
        
        // Trigger each workflow
        for (const workflow of workflows) {
          await sendWorkflowExecution({
            workflowId: workflow.id,
            trigger: 'funnel_conversion',
            data: {
              funnelId,
              eventId: conversion.eventId,
              userId: conversion.userId,
              revenue: conversion.revenue,
              conversionType: conversion.conversionType,
              orderId: conversion.orderId,
              timestamp: conversion.timestamp.toISOString(),
            },
          });
        }
      });
    }
    
    // Step 6: Aggregate analytics (run daily via cron)
    // This would be handled by a separate function
    
    return {
      success: true,
      eventsProcessed: enrichedEvents.length,
      conversions: conversions.length,
    };
  }
);
```

---

## Part 4: Analytics Dashboard

### 4.1 External Funnel Analytics Router

```typescript
// src/features/external-funnels/server/analytics-router.ts

import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import db from "@/lib/db";
import { TRPCError } from "@trpc/server";

export const funnelAnalyticsRouter = createTRPCRouter({
  /**
   * Get real-time funnel stats
   */
  getRealTimeStats: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const funnel = await db.funnel.findFirst({
        where: {
          id: input.funnelId,
          organizationId: ctx.orgId!,
        },
      });
      
      if (!funnel) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Active sessions in last hour
      const activeSessions = await db.funnelSession.count({
        where: {
          funnelId: input.funnelId,
          startedAt: {
            gte: oneHourAgo,
          },
        },
      });
      
      // Events in last hour
      const recentEvents = await db.funnelEvent.count({
        where: {
          funnelId: input.funnelId,
          timestamp: {
            gte: oneHourAgo,
          },
        },
      });
      
      // Conversions today
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const conversionsToday = await db.funnelEvent.count({
        where: {
          funnelId: input.funnelId,
          isConversion: true,
          timestamp: {
            gte: startOfDay,
          },
        },
      });
      
      // Revenue today
      const revenueToday = await db.funnelEvent.aggregate({
        where: {
          funnelId: input.funnelId,
          isConversion: true,
          timestamp: {
            gte: startOfDay,
          },
        },
        _sum: {
          revenue: true,
        },
      });
      
      return {
        activeVisitors: activeSessions,
        eventsLastHour: recentEvents,
        conversionsToday,
        revenueToday: revenueToday._sum.revenue || 0,
      };
    }),
  
  /**
   * Get funnel overview metrics
   */
  getOverview: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const analytics = await db.funnelAnalyticsSummary.aggregate({
        where: {
          funnelId: input.funnelId,
          date: {
            gte: input.dateFrom,
            lte: input.dateTo,
          },
        },
        _sum: {
          sessions: true,
          uniqueVisitors: true,
          pageViews: true,
          conversions: true,
          revenue: true,
          checkouts: true,
          formSubmissions: true,
          buttonClicks: true,
        },
        _avg: {
          conversionRate: true,
          bounceRate: true,
          avgSessionDuration: true,
          avgOrderValue: true,
        },
      });
      
      return {
        sessions: analytics._sum.sessions || 0,
        visitors: analytics._sum.uniqueVisitors || 0,
        pageViews: analytics._sum.pageViews || 0,
        conversions: analytics._sum.conversions || 0,
        revenue: analytics._sum.revenue || 0,
        
        conversionRate: analytics._avg.conversionRate || 0,
        bounceRate: analytics._avg.bounceRate || 0,
        avgSessionDuration: analytics._avg.avgSessionDuration || 0,
        avgOrderValue: analytics._avg.avgOrderValue || 0,
        
        checkouts: analytics._sum.checkouts || 0,
        formSubmissions: analytics._sum.formSubmissions || 0,
        buttonClicks: analytics._sum.buttonClicks || 0,
      };
    }),
  
  /**
   * Get traffic sources breakdown
   */
  getTrafficSources: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sources = await db.funnelAnalyticsSummary.groupBy({
        by: ['source', 'medium', 'campaign'],
        where: {
          funnelId: input.funnelId,
          date: {
            gte: input.dateFrom,
            lte: input.dateTo,
          },
        },
        _sum: {
          sessions: true,
          conversions: true,
          revenue: true,
        },
        orderBy: {
          _sum: {
            sessions: 'desc',
          },
        },
        take: 10,
      });
      
      return sources.map(s => ({
        source: s.source || 'direct',
        medium: s.medium || 'none',
        campaign: s.campaign || '(not set)',
        sessions: s._sum.sessions || 0,
        conversions: s._sum.conversions || 0,
        revenue: s._sum.revenue || 0,
        conversionRate: s._sum.sessions 
          ? ((s._sum.conversions || 0) / s._sum.sessions) * 100 
          : 0,
      }));
    }),
  
  /**
   * Get top events
   */
  getTopEvents: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const events = await db.funnelEvent.groupBy({
        by: ['eventName'],
        where: {
          funnelId: input.funnelId,
          timestamp: {
            gte: input.dateFrom,
            lte: input.dateTo,
          },
        },
        _count: {
          eventId: true,
        },
        orderBy: {
          _count: {
            eventId: 'desc',
          },
        },
        take: input.limit,
      });
      
      return events.map(e => ({
        eventName: e.eventName,
        count: e._count.eventId,
      }));
    }),
  
  /**
   * Get event timeline (for charts)
   */
  getEventTimeline: protectedProcedure
    .input(
      z.object({
        funnelId: z.string(),
        dateFrom: z.date(),
        dateTo: z.date(),
        interval: z.enum(['hour', 'day', 'week']).default('day'),
        eventName: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // This would use raw SQL for time-series aggregation
      // Simplified version here
      const timeline = await db.funnelEvent.groupBy({
        by: ['timestamp'],
        where: {
          funnelId: input.funnelId,
          timestamp: {
            gte: input.dateFrom,
            lte: input.dateTo,
          },
          ...(input.eventName && { eventName: input.eventName }),
        },
        _count: {
          eventId: true,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });
      
      // Group by interval
      // ... aggregation logic
      
      return timeline;
    }),
});
```

---

## Part 5: Workflow Integration

### 5.1 New Workflow Trigger: Funnel Event

```typescript
// src/features/nodes/triggers/components/funnel-event-trigger/node.tsx

import { BaseTriggerNode } from "../base-trigger-node";

export function FunnelEventTriggerNode() {
  return (
    <BaseTriggerNode
      type="FUNNEL_EVENT_TRIGGER"
      title="Funnel Event"
      description="Triggers when a specific event occurs in a funnel"
      icon={<Globe className="h-4 w-4" />}
    />
  );
}
```

```typescript
// src/features/nodes/triggers/components/funnel-event-trigger/dialog.tsx

export function FunnelEventTriggerDialog({ node, onSave, onClose }: DialogProps) {
  const [funnelId, setFunnelId] = useState(node?.data?.funnelId || '');
  const [eventName, setEventName] = useState(node?.data?.eventName || '');
  const [filters, setFilters] = useState(node?.data?.filters || {});
  
  const { data: funnels } = useQuery(trpc.funnels.list.queryOptions({}));
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Funnel Event Trigger</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Select Funnel</Label>
            <Select value={funnelId} onValueChange={setFunnelId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose funnel" />
              </SelectTrigger>
              <SelectContent>
                {funnels?.funnels.map(funnel => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name} {funnel.funnelType === 'EXTERNAL' && '(External)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Event Name</Label>
            <Select value={eventName} onValueChange={setEventName}>
              <SelectTrigger>
                <SelectValue placeholder="Choose event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page_view">Page View</SelectItem>
                <SelectItem value="form_submit">Form Submit</SelectItem>
                <SelectItem value="button_click">Button Click</SelectItem>
                <SelectItem value="conversion">Conversion</SelectItem>
                <SelectItem value="checkout_initiated">Checkout Initiated</SelectItem>
                <SelectItem value="checkout_abandoned">Checkout Abandoned</SelectItem>
                <SelectItem value="*">Any Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Add filters for event properties */}
          <div>
            <Label>Filters (optional)</Label>
            <JsonEditor 
              value={filters} 
              onChange={setFilters}
              placeholder="Add conditions..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            onSave({
              ...node,
              data: {
                funnelId,
                eventName,
                filters,
              },
            });
          }}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 5.2 Workflow Execution Actions

Add new execution nodes:

- **Create Contact from Funnel Event** - Extract user info from event and create contact
- **Create Deal from Conversion** - Create deal when funnel conversion happens
- **Send Abandonment Email** - Trigger email when checkout_abandoned event fires
- **Update Contact Score** - Increase/decrease score based on funnel engagement

---

## Part 6: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create `@aurea/tracking-sdk` package
- [ ] Implement core SDK functionality (track, identify, page)
- [ ] Build event ingestion API (`/api/track/events`)
- [ ] Add database schema for FunnelEvent, FunnelSession
- [ ] Create funnel registration tRPC router
- [ ] Test SDK integration with TTR funnel

### Phase 2: Analytics & Dashboard (Week 3-4)
- [ ] Build Inngest event processing function
- [ ] Implement analytics aggregation (daily cron)
- [ ] Create analytics tRPC router
- [ ] Build funnel analytics dashboard UI
- [ ] Add real-time stats display
- [ ] Implement traffic source tracking

### Phase 3: CRM Integration (Week 5-6)
- [ ] Auto-create contacts from conversions
- [ ] Auto-create deals from high-value conversions
- [ ] Add funnel attribution to contacts/deals
- [ ] Build contact lifecycle automation
- [ ] Implement lead scoring from funnel engagement

### Phase 4: Workflow Integration (Week 7-8)
- [ ] Create "Funnel Event" trigger node
- [ ] Create "Funnel Conversion" trigger node
- [ ] Add workflow execution on funnel events
- [ ] Build abandonment workflow templates
- [ ] Add re-engagement workflows

### Phase 5: Advanced Features (Week 9-10)
- [ ] Add pixel forwarding (Meta, GA4, TikTok)
- [ ] Implement session recording (optional)
- [ ] Add A/B testing support
- [ ] Build funnel step tracking
- [ ] Create revenue attribution model

### Phase 6: Polish & Documentation (Week 11-12)
- [ ] Write comprehensive SDK documentation
- [ ] Create integration guide for custom funnels
- [ ] Build example templates
- [ ] Add error monitoring and alerting
- [ ] Performance optimization
- [ ] Security audit

---

## Part 7: Key Differentiators

### What Makes This System Unique

1. **Custom Code Freedom**
   - Unlike ClickFunnels/GoHighLevel, users can use ANY tech stack
   - Full control over UI/UX with custom packages (framer-motion, etc.)
   - No limitations on design or functionality

2. **Seamless CRM Integration**
   - Automatic contact/deal creation
   - Funnel events trigger workflows
   - Full attribution tracking

3. **Developer-First SDK**
   - TypeScript-first design
   - React components for easy integration
   - Comprehensive documentation

4. **Privacy-Focused**
   - GDPR compliant by default
   - IP anonymization
   - Respect Do Not Track

5. **Real-Time Everything**
   - Live analytics updates
   - Instant workflow triggers
   - Real-time dashboard

6. **Unified Platform**
   - One platform for funnels, CRM, workflows, communication
   - Single source of truth
   - No fragmented data

---

## Security Considerations

1. **API Key Management**
   - Generate cryptographically secure API keys
   - Hash keys before storing in database
   - Allow key rotation without downtime

2. **Rate Limiting**
   - Implement per-funnel rate limits
   - Prevent abuse and DoS attacks
   - Use Redis for distributed rate limiting

3. **Data Validation**
   - Validate all incoming events
   - Sanitize user inputs
   - Prevent injection attacks

4. **CORS Configuration**
   - Whitelist allowed domains
   - Validate Origin headers
   - Secure credential handling

5. **Privacy Compliance**
   - IP anonymization by default
   - Data retention policies
   - GDPR right to deletion
   - Cookie consent integration

---

## Performance Optimization

1. **SDK Optimization**
   - Lazy load non-critical features
   - Batch event sending (configurable)
   - Use service workers for offline queue
   - Compress large payloads

2. **API Optimization**
   - Edge deployment for low latency
   - Database connection pooling
   - Efficient indexing strategy
   - Caching frequently accessed data

3. **Processing Optimization**
   - Async event processing via Inngest
   - Batch aggregations during off-peak
   - Use materialized views for analytics
   - Optimize database queries

4. **Frontend Optimization**
   - Server-side rendering for dashboards
   - Incremental data loading
   - WebSocket for real-time updates
   - Optimize bundle size

---

## Success Metrics

### Technical Metrics
- Event ingestion latency < 100ms (p95)
- Dashboard load time < 1s
- SDK bundle size < 50KB (gzipped)
- 99.9% API uptime

### Business Metrics
- Number of external funnels connected
- Total events tracked per month
- Conversion rate improvement
- Customer retention

### User Experience Metrics
- Time to first event tracked
- Setup completion rate
- Dashboard engagement
- Feature adoption rate

---

## Conclusion

This SDK and integration system provides a comprehensive solution for connecting custom funnels to Aurea CRM while maintaining the flexibility and power of custom code. By focusing on developer experience, privacy, and seamless integration, Aurea can compete with and surpass GoHighLevel and ClickFunnels in this space.

The phased implementation approach allows for iterative development and early user feedback, ensuring the system meets real-world needs while maintaining high quality and performance standards.
