import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { publicationSeoConfigSchema } from "@/features/publications/contracts";
import { PublishedForm } from "@/features/publications/public/published-form";
import { PublishedSchedule } from "@/features/publications/public/published-schedule";
import { PublishedWidget } from "@/features/publications/public/published-widget";
import {
  getPublishedPublicationByPath,
  getPublishedPublicationByPathVersion,
} from "@/features/publications/public/resolver";
import { redirectPublishedChannel } from "@/features/publications/public/channel-redirect";
import {
  PUBLICATION_TARGET_HEADER,
  PUBLICATION_VERSION_HEADER,
} from "@/features/publications/lib/frame-origin-policy";

type PublicationPageProps = {
  params: Promise<{
    organizationSlug: string;
    targetSlug: string;
    path?: string[];
  }>;
};

export async function generateMetadata({
  params,
}: PublicationPageProps): Promise<Metadata> {
  const route = await params;
  const target = await getPublishedPublicationByPath({
    organizationSlug: route.organizationSlug,
    slug: route.targetSlug,
  });
  if (!target) return { title: "Page not found", robots: { index: false } };

  const seo = publicationSeoConfigSchema.parse(target.seoSnapshot);
  const title = seo.title ?? target.name;
  const description = seo.description ?? undefined;
  const image = seo.imageUrl;
  return {
    title,
    description,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    robots: { index: seo.index, follow: seo.follow },
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function PublicationPage({
  params,
}: PublicationPageProps) {
  const route = await params;
  if ((route.path?.length ?? 0) > 1) notFound();
  const requestHeaders = await headers();
  const targetId = requestHeaders.get(PUBLICATION_TARGET_HEADER);
  const versionId = requestHeaders.get(PUBLICATION_VERSION_HEADER);
  if (!targetId || !versionId) notFound();
  const target = await getPublishedPublicationByPathVersion({
    organizationSlug: route.organizationSlug,
    slug: route.targetSlug,
    targetId,
    versionId,
  });
  if (!target) notFound();

  if (target.kind === "SCHEDULE") {
    return (
      <PublishedSchedule
        locationId={target.locationId}
        organizationId={target.organizationId}
        snapshot={target.snapshot}
        themeSnapshot={target.themeSnapshot}
      />
    );
  }

  if (target.kind === "FORM") {
    if ((route.path?.length ?? 0) > 0) notFound();
    return (
      <PublishedForm
        snapshot={target.snapshot}
        targetId={target.id}
        versionId={target.versionId}
        themeSnapshot={target.themeSnapshot}
        consentSnapshot={target.consentSnapshot}
      />
    );
  }

  if (target.kind === "WIDGET") {
    if ((route.path?.length ?? 0) > 0) notFound();
    return (
      <PublishedWidget
        organizationId={target.organizationId}
        locationId={target.locationId}
        sourceId={target.sourceId}
        snapshot={target.snapshot}
        themeSnapshot={target.themeSnapshot}
      />
    );
  }

  redirectPublishedChannel({
    kind: target.kind,
    organizationSlug: route.organizationSlug,
    sourceId: target.sourceId,
    snapshot: target.snapshot,
    targetSlug: route.targetSlug,
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
