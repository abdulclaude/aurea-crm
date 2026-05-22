"use client";

import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";

export function useAnalytics() {
  const posthog = usePostHog();

  const trackEvent = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      if (posthog) {
        posthog.capture(event, properties);
      }
    },
    [posthog]
  );

  const trackPageView = useCallback(
    (path?: string) => {
      if (posthog) {
        posthog.capture("$pageview", { path: path || window.location.pathname });
      }
    },
    [posthog]
  );

  const trackWorkflowEvent = useCallback(
    (
      action: "created" | "updated" | "deleted" | "executed" | "archived",
      workflowId: string,
      metadata?: Record<string, unknown>
    ) => {
      trackEvent(`workflow_${action}`, {
        workflow_id: workflowId,
        ...metadata,
      });
    },
    [trackEvent]
  );

  const trackClientEvent = useCallback(
    (
      action: "created" | "updated" | "deleted" | "scored" | "lifecycle_changed",
      clientId: string,
      metadata?: Record<string, unknown>
    ) => {
      trackEvent(`client_${action}`, {
        client_id: clientId,
        ...metadata,
      });
    },
    [trackEvent]
  );

  const trackDealEvent = useCallback(
    (
      action: "created" | "updated" | "deleted" | "stage_changed" | "won" | "lost",
      dealId: string,
      metadata?: Record<string, unknown>
    ) => {
      trackEvent(`deal_${action}`, {
        deal_id: dealId,
        ...metadata,
      });
    },
    [trackEvent]
  );

  const trackFormEvent = useCallback(
    (
      action: "viewed" | "started" | "completed" | "abandoned",
      formId: string,
      metadata?: Record<string, unknown>
    ) => {
      trackEvent(`form_${action}`, {
        form_id: formId,
        ...metadata,
      });
    },
    [trackEvent]
  );

  const trackIntegrationEvent = useCallback(
    (
      action: "connected" | "disconnected" | "sync_started" | "sync_completed" | "sync_failed",
      provider: string,
      metadata?: Record<string, unknown>
    ) => {
      trackEvent(`integration_${action}`, {
        provider,
        ...metadata,
      });
    },
    [trackEvent]
  );

  const setUserProperties = useCallback(
    (properties: Record<string, unknown>) => {
      if (posthog) {
        posthog.setPersonProperties(properties);
      }
    },
    [posthog]
  );

  const setGroupProperties = useCallback(
    (groupType: "organization" | "location", groupKey: string, properties: Record<string, unknown>) => {
      if (posthog) {
        posthog.group(groupType, groupKey, properties);
      }
    },
    [posthog]
  );

  return {
    trackEvent,
    trackPageView,
    trackWorkflowEvent,
    trackClientEvent,
    trackDealEvent,
    trackFormEvent,
    trackIntegrationEvent,
    setUserProperties,
    setGroupProperties,
  };
}
