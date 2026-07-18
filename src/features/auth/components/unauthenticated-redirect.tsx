"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function UnauthenticatedRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    const callbackUrl = `${pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(
      `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }, [pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
    >
      <LoaderCircle className="size-6 animate-spin text-primary/50" />
      <span className="sr-only">Redirecting to sign in</span>
    </div>
  );
}
