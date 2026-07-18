import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Pricing Option" };

export default function NewPricingOptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
