import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  applyAuthenticatedPreviewSecurityHeaders,
  applyPublicationSecurityHeaders,
  getPublicationFrameOrigins,
  PUBLICATION_TARGET_HEADER,
  PUBLICATION_VERSION_HEADER,
} from "@/features/publications/lib/frame-origin-policy";
import { getPublishedPublicationByPath } from "@/features/publications/public/resolver";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(PUBLICATION_TARGET_HEADER);
  requestHeaders.delete(PUBLICATION_VERSION_HEADER);

  if (request.nextUrl.pathname.startsWith("/widget-preview/")) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    applyAuthenticatedPreviewSecurityHeaders(response.headers);
    return response;
  }

  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const organizationSlug = segments[1];
  const targetSlug = segments[2];
  let frameOrigins: string[] = [];
  if (organizationSlug && targetSlug) {
    try {
      const target = await getPublishedPublicationByPath({
        organizationSlug: decodeURIComponent(organizationSlug),
        slug: decodeURIComponent(targetSlug),
      });
      if (target) {
        requestHeaders.set(PUBLICATION_TARGET_HEADER, target.id);
        requestHeaders.set(PUBLICATION_VERSION_HEADER, target.versionId);
        frameOrigins = getPublicationFrameOrigins(target);
      }
    } catch {
      frameOrigins = [];
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applyPublicationSecurityHeaders(response.headers, frameOrigins);
  return response;
}

export const config = {
  matcher: ["/p/:path*", "/widget-preview/:path*"],
};
