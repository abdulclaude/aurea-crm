import type { Metadata } from "next";

export const metadata: Metadata = { title: "SMS" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
