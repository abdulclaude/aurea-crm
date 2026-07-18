import type {
  ContentLibraryKind,
  ContentLibraryPayload,
} from "@/features/content-settings/contracts";

import type { ContentFormValues, ContentItem } from "./types";

function emptyPayload(kind: ContentLibraryKind): ContentLibraryPayload {
  switch (kind) {
    case "TERMINOLOGY_PACK":
      return {
        kind,
        terms: [
          { key: "customer", label: "Customer", pluralLabel: "Customers" },
        ],
      };
    case "FAQ_COLLECTION":
      return { kind, entries: [] };
    case "MESSAGE_MACRO":
      return { kind, content: "", channel: "ALL", tags: [], isActive: true };
    case "PUBLIC_PROFILE":
      return {
        kind,
        slug: "public-profile",
        displayName: "",
        summary: null,
        email: null,
        phone: null,
        websiteUrl: null,
        bookingUrl: null,
        address: {
          line1: null,
          line2: null,
          city: null,
          region: null,
          postalCode: null,
          countryCode: null,
        },
        socialLinks: [],
      };
  }
}

export function initialContentFormValues(
  kind: ContentLibraryKind,
  item: ContentItem | null,
): ContentFormValues {
  if (item) {
    return {
      name: item.name,
      key: item.key,
      description: item.description ?? "",
      changeNote: "",
      payload: structuredClone(item.current.payload),
    };
  }
  return {
    name: "",
    key: kind === "PUBLIC_PROFILE" ? "public-profile" : "",
    description: "",
    changeNote: "",
    payload: emptyPayload(kind),
  };
}
