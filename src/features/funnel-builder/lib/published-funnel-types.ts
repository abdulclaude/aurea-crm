import type { DeviceType, FunnelBlockType, PixelProvider } from "@/db/enums";

export type PublishedFunnelBlock = {
  id: string;
  pageId: string | null;
  parentBlockId: string | null;
  type: FunnelBlockType;
  props: unknown;
  styles: unknown;
  order: number;
  visible: boolean;
  breakpoints: Array<{
    blockId: string;
    device: DeviceType;
    styles: unknown;
  }>;
  trackingEvent: {
    eventType: string;
    eventName: string | null;
    parameters: unknown;
  } | null;
};

export type PublishedPageData = {
  page: {
    id: string;
    funnelId: string;
    name: string;
    slug: string;
    isPublished: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    metaImage: string | null;
    customCss: string | null;
    customJs: string | null;
    blocks: PublishedFunnelBlock[];
  };
  pixelIntegrations: Array<{
    provider: PixelProvider;
    pixelId: string;
    enabled: boolean;
    metadata: unknown;
  }>;
};

export type FunnelRenderMode = "preview" | "published";
export type FunnelTrackingCategory = "ANALYTICS" | "MARKETING";

export type FunnelRenderPolicy = Readonly<{
  mode: FunnelRenderMode;
  allowCustomCode: boolean;
  allowCustomScripts: boolean;
  enableTracking: boolean;
  trackingCategories: readonly FunnelTrackingCategory[];
}>;

export type FunnelRenderPolicyInput = {
  mode: FunnelRenderMode;
  allowCustomCode?: boolean;
  allowCustomScripts?: boolean;
  enableTracking?: boolean;
  trackingCategories?: readonly FunnelTrackingCategory[];
};

export type BlockRenderContext = {
  deviceType: DeviceType;
  policy: FunnelRenderPolicy;
};

export function resolveFunnelRenderPolicy(
  input: FunnelRenderPolicyInput,
): FunnelRenderPolicy {
  if (input.mode === "preview") {
    return {
      mode: "preview",
      allowCustomCode: false,
      allowCustomScripts: false,
      enableTracking: false,
      trackingCategories: [],
    };
  }

  const enableTracking = input.enableTracking !== false;

  return {
    mode: "published",
    allowCustomCode: input.allowCustomCode === true,
    allowCustomScripts:
      input.allowCustomCode === true && input.allowCustomScripts !== false,
    enableTracking,
    trackingCategories: enableTracking
      ? (input.trackingCategories ?? ["ANALYTICS", "MARKETING"])
      : [],
  };
}

export const PREVIEW_FUNNEL_RENDER_POLICY = resolveFunnelRenderPolicy({
  mode: "preview",
});

export const PUBLISHED_FUNNEL_RENDER_POLICY = resolveFunnelRenderPolicy({
  mode: "published",
});

export const LEGACY_PUBLISHED_FUNNEL_RENDER_POLICY = resolveFunnelRenderPolicy({
  mode: "published",
  enableTracking: false,
});
