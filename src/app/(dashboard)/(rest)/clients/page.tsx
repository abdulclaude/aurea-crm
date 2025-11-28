import { IconPeopleAdd as AddClientIcon } from "central-icons/IconPeopleAdd";
import Link from "next/link";
import { Suspense } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClientsTable } from "@/features/organizations/components/clients-table";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between p-6 pb-0">
        <div className="">
          <h1 className="text-lg font-semibold">Manage all your clients</h1>
          <p className=" text-primary/75 text-xs">
            Filter, sort, and search every client workspace from one view.
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild>
            <Link
              href="/clients/new"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-8.5! bg-background! hover:bg-primary-foreground/50! hover:text-black!"
              )}
            >
              <AddClientIcon className="size-3" />
              <span>Add a new client</span>
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading clients...
          </div>
        }
      >
        <ClientsTable />
      </Suspense>
    </div>
  );
}
