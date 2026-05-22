"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type TextShimmerElement = keyof React.JSX.IntrinsicElements;

export type TextShimmerProps = {
  children: string;
  as?: TextShimmerElement;
  className?: string;
  duration?: number;
  spread?: number;
};

function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps): React.ReactElement {
  const MotionComponent = React.useMemo(
    () => motion.create(Component),
    [Component],
  );

  const dynamicSpread = React.useMemo(
    () => children.length * spread,
    [children, spread],
  );

  const shimmerStyle = React.useMemo(
    () =>
      ({
        "--spread": `${dynamicSpread}px`,
        backgroundImage:
          "var(--bg), linear-gradient(var(--base-color), var(--base-color))",
      }) satisfies React.CSSProperties & Record<"--spread", string>,
    [dynamicSpread],
  );

  return (
    <MotionComponent
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[background-repeat:no-repeat,padding-box]",
        "[--base-color:#18181b] [--base-gradient-color:#0284c7]",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        "dark:[--base-color:#a1a1aa] dark:[--base-gradient-color:#ffffff]",
        "dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={shimmerStyle}
    >
      {children}
    </MotionComponent>
  );
}

export const TextShimmer = React.memo(TextShimmerComponent);
