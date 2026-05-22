import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aurea Widget" };

const supportedWidgetTypes = new Set([
  "schedule",
  "booking",
  "membership",
  "instructors",
  "intro-offer",
  "lead-capture",
  "referral",
]);

interface PageProps {
  params: Promise<{ orgSlug: string; type: string }>;
  searchParams: Promise<{ widget?: string }>;
}

export default async function TypedEmbedPage({
  params,
  searchParams,
}: PageProps) {
  const { orgSlug, type } = await params;
  const { widget } = await searchParams;
  const normalizedType = type.toLowerCase();

  if (!supportedWidgetTypes.has(normalizedType)) {
    return <WidgetUnavailable label="Widget type is not supported." />;
  }

  if (normalizedType === "schedule") {
    const widgetParam = widget ? `&widget=${encodeURIComponent(widget)}` : "";
    redirect(`/embed/schedule?org=${encodeURIComponent(orgSlug)}${widgetParam}`);
  }

  return (
    <WidgetUnavailable
      label={`${normalizedType.replace("-", " ")} widget preview is not configured yet.`}
    />
  );
}

function WidgetUnavailable({ label }: { label: string }) {
  return (
    <div
      style={{
        alignItems: "center",
        color: "#6b7280",
        display: "flex",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        justifyContent: "center",
        minHeight: "200px",
        padding: "16px",
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
}
