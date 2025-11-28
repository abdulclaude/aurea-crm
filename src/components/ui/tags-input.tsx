"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  readOnly?: boolean;
  className?: string;
}

export function TagsInput({
  value,
  onChange,
  placeholder = "Add tag...",
  maxTags,
  readOnly = false,
  className,
}: TagsInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (
      trimmedValue &&
      !value.includes(trimmedValue) &&
      (!maxTags || value.length < maxTags)
    ) {
      onChange([...value, trimmedValue]);
      setInputValue("");
    }
  };

  const removeTag = (tag: string) => {
    if (readOnly) return;
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap gap-2 rounded-sm border border-black/10 bg-background px-2 py-2 text-sm",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          className="gap-1 pr-1 text-[11px] bg-background border border-black/10 rounded-sm text-primary"
        >
          {tag}
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-3 p-0 bg-transparent hover:bg-transparent text-primary/75 hover:text-primary border-none"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
            >
              <X className="size-3!" />
            </Button>
          )}
        </Badge>
      ))}
      {!readOnly && (
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={value.length === 0 ? placeholder : ""}
          className="h-7 flex-1 border-0 bg-transparent p-0 placeholder:text-primary/75 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent focus:bg-transparent"
          disabled={maxTags !== undefined && value.length >= maxTags}
        />
      )}
    </div>
  );
}

export function TagsDisplay({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) {
    return <span className="text-xs text-primary/75">No tags</span>;
  }

  return (
    <div className="flex w-max relative -space-x-2">
      {tags.slice(0, 1).map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-[11px] bg-[#202e32] border-black/10 text-white pr-2.5"
        >
          {tag}
        </Badge>
      ))}

      {tags.length > 1 && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 bg-[#202e32] text-white border-2 border-white "
        >
          +{tags.length - 1}
        </Badge>
      )}
    </div>
  );
}
