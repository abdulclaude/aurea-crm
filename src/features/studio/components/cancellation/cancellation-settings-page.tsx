"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ReceiptText } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";

import { ChargesPanel } from "./charges-panel";
import { PoliciesPanel } from "./policies-panel";

export function CancellationSettingsPage() {
  const trpc = useTRPC();
  const [hydrated, setHydrated] = useState(false);
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const canManage = hydrated && Boolean(
    permissions.data?.capabilities.includes("commerce.manage"),
  );

  useEffect(() => setHydrated(true), []);

  return (
    <div className="min-w-0">
      <header className="p-8">
        <h1 className="text-xl font-semibold">Cancellations</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Policies, member fees, class-credit deductions, and payment
          collection.
        </p>
      </header>
      <Separator />
      <Tabs defaultValue="policies" className="gap-0">
        <div className="p-4 sm:px-8">
          <TabsList>
            <TabsTrigger value="policies">
              <ClipboardList />
              Policies
            </TabsTrigger>
            <TabsTrigger value="fees">
              <ReceiptText />
              Fee operations
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="policies">
          <PoliciesPanel canManage={canManage} hydrated={hydrated} />
        </TabsContent>
        <TabsContent value="fees">
          <ChargesPanel canManage={canManage} hydrated={hydrated} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
