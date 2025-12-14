/**
 * Public Layout
 *
 * Minimal layout for public-facing pages (funnels, landing pages)
 * Does not include dashboard sidebar or authentication requirements
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
