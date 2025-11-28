"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { XIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactTagsFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function ContactTagsField({ value, onChange }: ContactTagsFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-start p-2 bg-[#1a2326] border-white/5 hover:bg-[#1a2326] hover:brightness-120"
        >
          <div className="flex flex-wrap items-center gap-1">
            {value.length > 0 ? (
              value.map((tag) => (
                <Badge
                  key={tag}
                  className="bg-white/10 text-white border-white/20 text-[11px] flex items-center gap-1 pr-1"
                >
                  {tag}
                  <button
                    type="button"
                    className="size-auto cursor-pointer hover:text-white/60"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="px-2 py-px text-white/40 text-xs">
                Select tags...
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 bg-[#202e32] border-white/5"
        align="start"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Add new tag
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Type tag name..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-[#1a2326] border-white/5 text-xs"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddTag}
                disabled={!inputValue.trim()}
                className="text-xs"
              >
                Add
              </Button>
            </div>
          </div>

          {value.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Current tags
              </label>
              <div className="space-y-1">
                {value.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs hover:bg-[#1a2326] transition"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <span className="text-white">{tag}</span>
                    <CheckIcon className="size-4 text-white/50" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
