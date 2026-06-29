import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing Options" };

export default function PricingOptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
