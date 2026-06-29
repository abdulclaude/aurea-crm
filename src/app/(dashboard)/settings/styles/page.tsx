import type { Metadata } from "next";

import { Separator } from "@/components/ui/separator";
import { GlobalStylesManager } from "@/features/global-styles/components/global-styles-manager";

export const metadata: Metadata = {
  title: "Styles",
  description: "Manage brand colors, typography, and design system presets",
};

export default function StylesSettingsPage() {
  return (
    <div>
      <div className="p-6">
        <div className="flex flex-col justify-center gap-2">
          <h1 className="text-lg font-bold">Styles</h1>
        </div>

        <p className="text-muted-foreground text-xs">
          Manage brand colors, typography, and design system presets
        </p>
      </div>

      <Separator className="bg-black/10 dark:bg-white/5" />

      <div className="p-6">
        <GlobalStylesManager />
      </div>
    </div>
  );
}
