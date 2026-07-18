import type { Metadata } from "next";

export const metadata: Metadata = { title: "Member Profile" };

export default function MemberProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
