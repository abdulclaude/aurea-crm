import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aurea Studio — Class Schedule",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent antialiased">{children}</div>
  );
}
