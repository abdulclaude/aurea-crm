import { AnalyticsSidebarWrapper } from "@/features/external-funnels/components/analytics-sidebar-wrapper";

export default function AnalyticsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ funnelId: string }>;
}) {
  return (
    <AnalyticsSidebarWrapper params={params}>
      {children}
    </AnalyticsSidebarWrapper>
  );
}
