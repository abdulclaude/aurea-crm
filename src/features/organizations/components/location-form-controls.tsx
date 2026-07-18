"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

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

type SearchOption = {
  value: string;
  label: string;
};

type SearchComboboxProps = {
  id?: string;
  ariaDescribedBy?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
};

function getUniqueOptions(options: SearchOption[]): SearchOption[] {
  const seenValues = new Set<string>();

  return options.filter((option) => {
    if (seenValues.has(option.value)) {
      return false;
    }

    seenValues.add(option.value);
    return true;
  });
}

const PhoneInputField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input
    ref={ref}
    {...props}
    className="h-full min-w-0 flex-1 bg-transparent text-xs text-primary outline-none placeholder:text-muted-foreground"
  />
));
PhoneInputField.displayName = "PhoneInputField";

export function LocationPhoneInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <div className="flex h-9 w-full items-center rounded-lg bg-background px-3 ring ring-black/10 transition-colors focus-within:ring-sky-500 dark:ring-white/10">
      <PhoneInput
        international
        defaultCountry="GB"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        inputComponent={PhoneInputField}
        className="flex h-full w-full items-center gap-2"
      />
    </div>
  );
}

export function SearchCombobox({
  id,
  ariaDescribedBy,
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  disabled,
}: SearchComboboxProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const uniqueOptions = getUniqueOptions(options);
  const selected = uniqueOptions.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            "w-full justify-between truncate font-normal shadow-none",
            !selected && "text-primary/50",
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {uniqueOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
