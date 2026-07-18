import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workflow archives" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
