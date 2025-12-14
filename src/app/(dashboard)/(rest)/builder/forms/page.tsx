import { Metadata } from "next";
import { FormsList } from "@/features/forms-builder/components/forms-list";

export const metadata: Metadata = {
  title: "Forms",
  description: "Create and manage forms with conditional logic and multi-step flows",
};

export default function FormsPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground">
            Build intelligent forms with conditional logic and multi-step flows
          </p>
        </div>
      </div>

      <FormsList />
    </div>
  );
}
