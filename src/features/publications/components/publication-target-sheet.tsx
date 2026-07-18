"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicationDomainPanel } from "@/features/publications/components/publication-domain-panel";
import { PublicationEmbedPanel } from "@/features/publications/components/publication-embed-panel";
import { PublicationLifecycleActions } from "@/features/publications/components/publication-lifecycle-actions";
import { PublicationSettingsForm } from "@/features/publications/components/publication-settings-form";
import { PublicationStatusBadge } from "@/features/publications/components/publication-status-badge";
import { PublicationVersionsPanel } from "@/features/publications/components/publication-versions-panel";
import { KIND_LABELS } from "@/features/publications/components/publication-ui-types";
import { useTRPC } from "@/trpc/client";

type Props = {
  targetId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: (id: string) => Promise<void>;
};

export function PublicationTargetSheet({
  targetId,
  onOpenChange,
  onChanged,
}: Props): React.JSX.Element {
  const trpc = useTRPC();
  const target = useQuery({
    ...trpc.publications.get.queryOptions({ id: targetId ?? "" }),
    enabled: Boolean(targetId),
  });

  return (
    <Sheet open={Boolean(targetId)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        {target.isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : target.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium">
              Publication target unavailable
            </p>
            <p className="max-w-sm text-xs text-destructive">
              {target.error.message}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void target.refetch()}>
                Retry
              </Button>
              <SheetClose asChild>
                <Button>Close</Button>
              </SheetClose>
            </div>
          </div>
        ) : target.data ? (
          <>
            <SheetHeader className="border-b p-5 pr-16">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{target.data.name}</SheetTitle>
                <Badge variant="outline">{KIND_LABELS[target.data.kind]}</Badge>
                <PublicationStatusBadge status={target.data.status} />
              </div>
              <SheetDescription>/p/{target.data.slug}</SheetDescription>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close publication target"
                  className="absolute right-4 top-4"
                >
                  <X aria-hidden="true" />
                </Button>
              </SheetClose>
            </SheetHeader>
            <PublicationLifecycleActions
              target={target.data}
              onChanged={() => onChanged(target.data.id)}
            />
            <PublicationEmbedPanel target={target.data} />
            <Tabs defaultValue="configuration" className="min-h-0 flex-1 gap-0">
              <TabsList className="h-10 w-full shrink-0 justify-start rounded-none border-b bg-background px-4 shadow-none">
                <TabsTrigger value="configuration" className="flex-none">
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="domain" className="flex-none">
                  Domain
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-none">
                  Version history
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="configuration"
                className="min-h-0 overflow-y-auto"
              >
                <PublicationSettingsForm
                  key={`${target.data.id}:${String(target.data.updatedAt)}`}
                  target={target.data}
                  onChanged={() => onChanged(target.data.id)}
                />
              </TabsContent>
              <TabsContent value="domain" className="min-h-0 overflow-y-auto">
                <PublicationDomainPanel
                  key={`${target.data.id}:${String(target.data.updatedAt)}`}
                  target={target.data}
                  onChanged={() => onChanged(target.data.id)}
                />
              </TabsContent>
              <TabsContent value="history" className="min-h-0 overflow-y-auto">
                <PublicationVersionsPanel
                  target={target.data}
                  onChanged={() => onChanged(target.data.id)}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
