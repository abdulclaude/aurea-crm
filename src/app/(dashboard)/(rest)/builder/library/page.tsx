import { Metadata } from "next";
import { SmartSectionsLibrary } from "@/features/smart-sections/components/smart-sections-library";

export const metadata: Metadata = {
  title: "Library",
  description: "Browse and manage reusable sections for your funnels and forms",
};

export default function LibraryPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Sections</h1>
          <p className="text-muted-foreground">
            Reusable block groups that sync across all your funnels and forms
          </p>
        </div>
      </div>

      <SmartSectionsLibrary />
    </div>
  );
}
