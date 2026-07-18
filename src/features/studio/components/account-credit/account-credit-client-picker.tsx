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

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClientRow = RouterOutput["clients"]["list"]["items"][number];

type AccountCreditClientPickerProps = {
  clients: ClientRow[];
  open: boolean;
  search: string;
  selectedClient: Pick<ClientRow, "id" | "name" | "email"> | null;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (search: string) => void;
  onSelect: (client: Pick<ClientRow, "id" | "name" | "email">) => void;
};

export function AccountCreditClientPicker({
  clients,
  open,
  search,
  selectedClient,
  onOpenChange,
  onSearchChange,
  onSelect,
}: AccountCreditClientPickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-between sm:w-[360px]"
        >
          <span className="truncate">
            {selectedClient ? selectedClient.name : "Select client"}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={onSearchChange}
            placeholder="Search clients..."
          />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    onSelect({
                      id: client.id,
                      name: client.name,
                      email: client.email,
                    });
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
                      selectedClient?.id === client.id ? "opacity-100" : "opacity-0",
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
