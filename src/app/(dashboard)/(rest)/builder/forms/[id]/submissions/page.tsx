import { Metadata } from "next";
import { FormSubmissions } from "@/features/forms-builder/components/form-submissions";

export const metadata: Metadata = {
  title: "Form Submissions",
  description: "View form submissions and responses",
};

interface FormSubmissionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FormSubmissionsPage({
  params,
}: FormSubmissionsPageProps) {
  const { id } = await params;
  return <FormSubmissions formId={id} />;
}
