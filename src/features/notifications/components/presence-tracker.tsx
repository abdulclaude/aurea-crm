"use client";

import { usePresence } from "../hooks/use-presence";

/**
 * Component that tracks user presence in the background
 * Add this to your main layout to enable presence tracking
 */
export function PresenceTracker() {
  usePresence();
  return null;
}
