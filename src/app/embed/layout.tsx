import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aurea Studio — Class Schedule",
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-transparent antialiased">
        {children}
      </body>
    </html>
  );
}
