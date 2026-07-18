import type { Metadata } from "next";
import { FormsList } from "@/features/forms-builder/components/forms-list";

export const metadata: Metadata = {
  title: "Forms",
  description: "Create and manage forms with conditional logic and multi-step flows",
};

export default function FormsPage() {
  return <FormsList />;
}
