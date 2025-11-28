"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

const { useSession } = authClient;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

      if (apiKey) {
        posthog.init(apiKey, {
          api_host: host,
          person_profiles: "identified_only",
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: true,
          autocapture: false, // We'll use custom events for better control
        });
      }
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export function PostHogIdentifier() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user && typeof window !== "undefined") {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session]);

  return null;
}
