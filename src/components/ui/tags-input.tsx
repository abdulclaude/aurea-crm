"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
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
        "flex min-h-10 w-full flex-wrap gap-1 rounded-xl border border-black/10 bg-background p-1 text-sm",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          className="gap-1 pr-1 text-[11px] bg-background border border-black/10 rounded-lg text-primary"
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
          containerClassName="contents"
          className="h-7 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 placeholder:text-primary/75 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent focus:bg-transparent"
          disabled={maxTags !== undefined && value.length >= maxTags}
        />
      )}
    </div>
  );
}

export function TagsDisplay({
  maxVisible = 3,
  tags,
}: {
  maxVisible?: number;
  tags: string[];
}) {
  const uniqueTags = Array.from(new Set(tags.filter(Boolean)));
  if (uniqueTags.length === 0) {
    return <span className="text-xs text-primary/75">No tags</span>;
  }

  return (
    <div className="flex max-w-full flex-wrap gap-1">
      {uniqueTags.slice(0, maxVisible).map((tag) => (
        <TableBadge
          key={tag}
          color={TABLE_BADGE_COLORS.violet}
          className="max-w-36"
        >
          {tag}
        </TableBadge>
      ))}

      {uniqueTags.length > maxVisible && (
        <TableBadge color={TABLE_BADGE_COLORS.slate} className="px-1.5">
          +{uniqueTags.length - maxVisible} more
        </TableBadge>
      )}
    </div>
  );
}
