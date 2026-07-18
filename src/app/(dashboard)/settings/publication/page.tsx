import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PublicationControlPlane } from "@/features/publications/components";

function PublicationPageSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-0">
      <div className="space-y-3 p-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-20 w-full rounded-none" />
      <div className="space-y-2 p-8">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function PublicationPage(): React.JSX.Element {
  return (
    <Suspense fallback={<PublicationPageSkeleton />}>
      <PublicationControlPlane />
    </Suspense>
  );
}
