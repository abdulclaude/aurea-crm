import type { Metadata } from "next";

export const metadata: Metadata = { title: "Class Series" };

export default function ClassSeriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
