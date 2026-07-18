import { LoaderCircle } from "lucide-react";

export function SettingsLoading({ label = "Loading settings" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-40 items-center justify-center gap-2 p-6 text-xs text-primary/60"
    >
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
