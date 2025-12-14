import { Metadata } from "next";
import { SmartSectionEditor } from "@/features/smart-sections/components/smart-section-editor";

export const metadata: Metadata = {
  title: "Edit Section",
  description: "Edit your reusable section",
};

interface SmartSectionEditorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SmartSectionEditorPage({
  params,
}: SmartSectionEditorPageProps) {
  const { id } = await params;
  return <SmartSectionEditor sectionId={id} />;
}
