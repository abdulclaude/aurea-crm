import type { Metadata } from "next";

export const metadata: Metadata = { title: "Promo Codes" };

export default function PromoCodesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
