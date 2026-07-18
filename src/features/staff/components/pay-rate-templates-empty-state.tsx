import { CopyPlus } from "lucide-react";

export function PayRateTemplatesEmptyState(): React.JSX.Element {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-2 border-b border-black/5 px-6 py-12 text-center dark:border-white/5">
      <CopyPlus className="size-8 text-primary/20" />
      <p className="text-sm font-medium text-primary">No pay rate templates</p>
      <p className="max-w-md text-xs leading-5 text-primary/50">
        This workspace currently uses individual hourly rates for each team
        member.
      </p>
    </div>
  );
}
