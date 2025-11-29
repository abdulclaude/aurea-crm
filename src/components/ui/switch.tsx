"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-sky-500/30 data-[state=unchecked]:bg-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent ring data-[state=checked]:ring-sky-500/30 data-[state=unchecked]:ring-black/10 shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "border data-[state=checked]:border-sky-300/20 data-[state=checked]:border-b-sky-500/70 data-[state=checked]:border-t-sky-300/70 data-[state=checked]:bg-linear-to-b data-[state=checked]:from-sky-400 data-[state=checked]:to-sky-500 shadow-md ring-1 data-[state=checked]:ring-sky-500 pointer-events-none block size-4 rounded-full transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
          "data-[state=unchecked]:border-sky-500/20 data-[state=unchecked]:border-b-sky-600/70 data-[state=unchecked]:border-t-sky-400/70 data-[state=unchecked]:bg-linear-to-b data-[state=unchecked]:from-sky-500 data-[state=unchecked]:to-sky-600 shadow-md ring-1 data-[state=unchecked]:ring-sky-600"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
