import { Metadata } from "next";
import { TemplatesManagement } from "@/features/invoicing/components/templates-management";

export const metadata: Metadata = {
  title: "Invoice Templates",
  description: "Manage your invoice templates",
};

export default function InvoiceTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoice Templates</h1>
        <p className="text-muted-foreground">
          Create and manage professional invoice templates for your organization
        </p>
      </div>
      <TemplatesManagement />
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
