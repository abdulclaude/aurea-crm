import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <div
      className={cn(
        "relative",
        "before:pointer-events-none focus-within:before:opacity-100 before:opacity-0 before:absolute before:-inset-0.5 before:rounded-[12px] before:border before:border-sky-500 before:ring-2 before:ring-blue-500/20 before:transition",
        "after:pointer-events-none after:absolute after:inset-px after:rounded-lg after:shadow-highlight after:shadow-white/5 focus-within:after:shadow-sky-500 dark:focus-within:after:shadow-blue-500/20 after:transition w-full"
      )}
    >
      <input
        autoComplete="off"
        {...props}
        type={type}
        data-slot="input"
        className={cn(
          "relative text-xs text-primary dark:text-neutral-200 bg-white dark:bg-neutral-750 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 px-3.5 py-2 rounded-lg outline-none transition duration-150 hover:bg-primary-foreground/15 h-8.5! w-full ring ring-black/10 shadow-sm",
          className
        )}
      />
    </div>
  );
}

export { Input };
