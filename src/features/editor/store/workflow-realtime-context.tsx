"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const MONITORING_WINDOW_MS = 5 * 60 * 1000;
const SUBSCRIPTION_READINESS_TIMEOUT_MS = 2_000;

type WorkflowRealtimeContextValue = {
  enabled: boolean;
  registerSubscription: (key: string) => () => void;
  reportSubscriptionReady: (key: string, ready: boolean) => void;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
};

const WorkflowRealtimeContext =
  createContext<WorkflowRealtimeContextValue | null>(null);

const DEFAULT_WORKFLOW_REALTIME_CONTEXT: WorkflowRealtimeContextValue = {
  enabled: false,
  registerSubscription: () => () => undefined,
  reportSubscriptionReady: () => undefined,
  startMonitoring: () => Promise.resolve(),
  stopMonitoring: () => undefined,
};

export function WorkflowRealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registeredSubscriptionsRef = useRef(new Set<string>());
  const readySubscriptionsRef = useRef(new Set<string>());
  const readinessWaitersRef = useRef(new Set<() => void>());

  const resolveReadinessWaiters = useCallback(() => {
    const allReady = [...registeredSubscriptionsRef.current].every((key) =>
      readySubscriptionsRef.current.has(key),
    );
    if (!allReady) return;

    for (const resolve of readinessWaitersRef.current) {
      resolve();
    }
    readinessWaitersRef.current.clear();
  }, []);

  const registerSubscription = useCallback(
    (key: string) => {
      registeredSubscriptionsRef.current.add(key);

      return () => {
        registeredSubscriptionsRef.current.delete(key);
        readySubscriptionsRef.current.delete(key);
        resolveReadinessWaiters();
      };
    },
    [resolveReadinessWaiters],
  );

  const reportSubscriptionReady = useCallback(
    (key: string, ready: boolean) => {
      if (ready) {
        readySubscriptionsRef.current.add(key);
        resolveReadinessWaiters();
        return;
      }

      readySubscriptionsRef.current.delete(key);
    },
    [resolveReadinessWaiters],
  );

  const stopMonitoring = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    enabledRef.current = false;
    readySubscriptionsRef.current.clear();
    for (const resolve of readinessWaitersRef.current) {
      resolve();
    }
    readinessWaitersRef.current.clear();
    setEnabled(false);
  }, []);

  const startMonitoring = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      enabledRef.current = false;
      readySubscriptionsRef.current.clear();
      setEnabled(false);
    }, MONITORING_WINDOW_MS);

    if (enabledRef.current) {
      return Promise.resolve();
    }

    enabledRef.current = true;
    readySubscriptionsRef.current.clear();
    setEnabled(true);

    if (registeredSubscriptionsRef.current.size === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(readinessTimeout);
        resolve();
      };
      const readinessTimeout = setTimeout(() => {
        readinessWaitersRef.current.delete(finish);
        finish();
      }, SUBSCRIPTION_READINESS_TIMEOUT_MS);

      readinessWaitersRef.current.add(finish);
      resolveReadinessWaiters();
    });
  }, [resolveReadinessWaiters]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      for (const resolve of readinessWaitersRef.current) {
        resolve();
      }
      readinessWaitersRef.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({
      enabled,
      registerSubscription,
      reportSubscriptionReady,
      startMonitoring,
      stopMonitoring,
    }),
    [
      enabled,
      registerSubscription,
      reportSubscriptionReady,
      startMonitoring,
      stopMonitoring,
    ],
  );

  return (
    <WorkflowRealtimeContext.Provider value={value}>
      {children}
    </WorkflowRealtimeContext.Provider>
  );
}

export function useWorkflowRealtime(): WorkflowRealtimeContextValue {
  return (
    useContext(WorkflowRealtimeContext) ?? DEFAULT_WORKFLOW_REALTIME_CONTEXT
  );
}
