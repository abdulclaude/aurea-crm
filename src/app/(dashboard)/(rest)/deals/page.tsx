import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { DealsTable } from "@/features/crm/components/deals-table";
import { caller } from "@/trpc/server";
import { IconFistbump as AddDealIcon } from "central-icons/IconFistbump";
import { Badge } from "@/components/ui/badge";

export default async function DealsPage() {
  const contactCount = await caller.contacts.count();
  const hasContacts = contactCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary dark:text-white">
            Deals
          </h1>
          <p className="text-xs text-primary/75 dark:text-white/50">
            Manage your sales pipeline and deals
          </p>
        </div>

        {hasContacts ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/deals/new">
              <AddDealIcon className="size-3.5 " />
              Add deal
            </Link>
          </Button>
        ) : (
          <Badge className="text-xs rounded-full px-3 py-1.5 bg-rose-600 text-white ring ring-black/10 shadow-sm">
            Cannot make any deals until a contact has been added
          </Badge>
        )}
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary/75 flex items-center justify-center gap-3">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading deals...
          </div>
        }
      >
        <DealsTable />
      </Suspense>
    </div>
  );
}
