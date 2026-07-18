import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account Credit" };

export default function AccountCreditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
