import { LoaderCircle } from "lucide-react";
import { Suspense } from "react";

import { ContactsTable } from "@/features/crm/components/contacts-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { IconPeopleAdd as AddContactIcon } from "central-icons/IconPeopleAdd";
import Link from "next/link";

export default async function ContactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Contacts</h1>
          <p className="text-xs text-primary/75">
            Keep track of your contacts and leads
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/contacts/new">
            <AddContactIcon className="size-3.5" />
            Add contact{" "}
          </Link>
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading contacts...
          </div>
        }
      >
        <ContactsTable />
      </Suspense>
    </div>
  );
}
