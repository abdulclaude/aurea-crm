"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";

type ClientRow =
  inferRouterOutputs<AppRouter>["clients"]["list"]["items"][number];
export type ReferralClientOption = Pick<ClientRow, "id" | "name" | "email">;

type ReferralClientPickerProps = {
  clients: ReferralClientOption[];
  open: boolean;
  placeholder?: string;
  search: string;
  selectedClient: ReferralClientOption | null;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (search: string) => void;
  onSelect: (client: ReferralClientOption) => void;
};

export function ReferralClientPicker({
  clients,
  open,
  placeholder = "Select a referring client",
  search,
  selectedClient,
  onOpenChange,
  onSearchChange,
  onSelect,
}: ReferralClientPickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange} modal>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-between">
          <span className="truncate">
            {selectedClient?.name ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={onSearchChange}
            placeholder="Search members..."
          />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    onSelect(client);
                    onOpenChange(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{client.name}</p>
                    <p className="truncate text-xs text-primary/50">
                      {client.email ?? "No email"}
                    </p>
                  </div>
                  <Check
                    className={cn(
                      "size-4",
                      selectedClient?.id === client.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
