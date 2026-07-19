import { Separator } from "@/components/ui/separator";

export function CommunicationSettingsPage({
  title,
  description,
  children,
  contentClassName = "p-6",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="w-full min-w-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold text-primary">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Separator />
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
