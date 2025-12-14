import { Metadata } from "next";
import { FormEditor } from "@/features/forms-builder/components/form-editor";

export const metadata: Metadata = {
  title: "Form Editor",
  description: "Build and customize your form",
};

interface FormEditorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FormEditorPage({ params }: FormEditorPageProps) {
  const { id } = await params;
  return <FormEditor formId={id} />;
}
