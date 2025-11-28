"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAnalytics } from "./hooks";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      trackPageView(url);
    }
  }, [pathname, searchParams, trackPageView]);

  return null;
}
