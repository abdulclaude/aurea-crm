"use client";

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

export type StudioResourceOption = {
  id: string;
  label: string;
  description?: string;
};

type StudioResourcePickerProps = {
  emptyText: string;
  options: StudioResourceOption[];
  placeholder: string;
  search: string;
  searchPlaceholder: string;
  selected: StudioResourceOption | null;
  onSearchChange: (value: string) => void;
  onSelect: (option: StudioResourceOption) => void;
};

export function StudioResourcePicker({
  emptyText,
  options,
  placeholder,
  search,
  searchPlaceholder,
  selected,
  onSearchChange,
  onSelect,
}: StudioResourcePickerProps) {
  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-between">
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => onSelect(option)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{option.label}</p>
                    {option.description ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    ) : null}
                  </div>
                  <Check
                    className={cn(
                      "size-4",
                      selected?.id === option.id ? "opacity-100" : "opacity-0",
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
