import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { publicationSeoConfigSchema } from "@/features/publications/contracts";
import { redirectPublishedChannel } from "@/features/publications/public/channel-redirect";
import { PublishedForm } from "@/features/publications/public/published-form";
import {
  getPublicationControlByDomain,
  getPublishedPublicationByDomain,
} from "@/features/publications/public/resolver";
import { PublishedSchedule } from "@/features/publications/public/published-schedule";
import { PublishedWidget } from "@/features/publications/public/published-widget";

type PublicDomainPageProps = {
  params: Promise<{ slug: string }>;
};

function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase().replace(/\.$/, "") ?? "";
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = normalizeHost(requestHeaders.get("host") ?? "");
  const target = await getPublishedPublicationByDomain(host);
  if (!target) return { title: "Page not found", robots: { index: false } };

  const seo = publicationSeoConfigSchema.parse(target.seoSnapshot);
  const title = seo.title ?? target.name;
  return {
    title,
    description: seo.description ?? undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    robots: { index: seo.index, follow: seo.follow },
    openGraph: {
      title,
      description: seo.description ?? undefined,
      images: seo.imageUrl ? [seo.imageUrl] : [],
    },
  };
}

export default async function PublicDomainPage({
  params,
}: PublicDomainPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const requestHeaders = await headers();
  const host = normalizeHost(requestHeaders.get("host") ?? "");
  const target = await getPublishedPublicationByDomain(host);

  if (!target) {
    if (await getPublicationControlByDomain(host)) notFound();
    notFound();
  }

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
    organizationSlug: target.organizationSlug,
    sourceId: target.sourceId,
    snapshot: target.snapshot,
    targetSlug: slug,
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
