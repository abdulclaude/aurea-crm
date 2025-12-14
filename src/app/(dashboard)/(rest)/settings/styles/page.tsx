import { Metadata } from "next";
import { GlobalStylesManager } from "@/features/global-styles/components/global-styles-manager";

export const metadata: Metadata = {
  title: "Global Styles",
  description: "Manage brand colors, fonts, and design system presets",
};

export default function GlobalStylesPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Styles</h1>
          <p className="text-muted-foreground">
            Manage brand colors, typography, and design system presets
          </p>
        </div>
      </div>

      <GlobalStylesManager />
    </div>
  );
}
