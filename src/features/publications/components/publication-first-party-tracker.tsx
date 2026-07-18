"use client";

import { useEffect, useRef } from "react";

type PublicationFirstPartyTrackerProps = {
  targetId: string;
  token: string;
  versionId: string;
};

export function PublicationFirstPartyTracker({
  targetId,
  token,
  versionId,
}: PublicationFirstPartyTrackerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || privacySignalEnabled()) return;
    initialized.current = true;
    const sessionId = getSessionId(targetId, versionId);

    sendEvent({
      eventName: "page_view",
      properties: {},
      sessionId,
      token,
    });

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>("[data-aurea-track]");
      if (!element || element.tagName === "FORM") return;
      sendTrackedElement(element, sessionId, token, "click");
    };
    const handleSubmit = (event: SubmitEvent) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      if (!event.target.matches("[data-aurea-track]")) return;
      sendTrackedElement(event.target, sessionId, token, "submit");
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
    };
  }, [targetId, token, versionId]);

  return null;
}

function sendTrackedElement(
  element: HTMLElement,
  sessionId: string,
  token: string,
  interaction: "click" | "submit",
) {
  const configuredName =
    element.dataset.aureaEventName ?? element.dataset.aureaTrack;
  const label = normalizeEventName(configuredName) ?? "tracked_element";
  sendEvent({
    eventName: "public_interaction",
    properties: { interaction, label },
    sessionId,
    token,
  });
}

function sendEvent(input: {
  eventName: "page_view" | "public_interaction";
  properties: Record<string, string>;
  sessionId: string;
  token: string;
}) {
  const referrer = referrerOrigin();
  const utm = readUtm();
  const body = JSON.stringify({
    token: input.token,
    events: [
      {
        eventId: crypto.randomUUID(),
        eventName: input.eventName,
        occurredAt: Date.now(),
        page: {
          path: window.location.pathname,
          title: document.title.slice(0, 200),
          ...(referrer ? { referrerOrigin: referrer } : {}),
        },
        properties: input.properties,
        sessionId: input.sessionId,
        ...(utm ? { utm } : {}),
      },
    ],
  });
  void fetch("/api/publications/tracking/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}

function getSessionId(targetId: string, versionId: string): string {
  const key = `aurea_publication_session_${targetId}_${versionId}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function normalizeEventName(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return /^[a-zA-Z0-9_.:-]{1,80}$/.test(normalized) ? normalized : null;
}

function referrerOrigin(): string | null {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return null;
  }
}

function readUtm(): Record<string, string> | null {
  const params = new URLSearchParams(window.location.search);
  const values = Object.fromEntries(
    ["source", "medium", "campaign", "term", "content"]
      .map((key) => [key, params.get(`utm_${key}`)?.trim().slice(0, 200)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return Object.keys(values).length > 0 ? values : null;
}

function privacySignalEnabled(): boolean {
  const navigatorWithGpc = navigator as Navigator & {
    globalPrivacyControl?: boolean;
  };
  return (
    navigator.doNotTrack === "1" ||
    navigatorWithGpc.globalPrivacyControl === true
  );
}
