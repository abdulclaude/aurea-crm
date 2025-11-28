"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      richColors
      closeButton
      className="z-[100]"
      toastOptions={{
        classNames: {
          toast:
            "bg-background text-foreground ring-1! ring-black/10! shadow-lg! border-none! rounded-lg! px-4 py-3 gap-3",
          title: "font-medium text-xs",
          description: "text-xs text-muted-foreground",
          actionButton:
            "bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs",
          cancelButton:
            "bg-muted hidden! text-muted-foreground px-3 py-1 rounded-md text-xs",
          closeButton: "text-muted-foreground hover:text-foreground transition",
          icon: "mt-0.5",
          success: "bg-emerald-600! text-emerald-100!",
          info: "bg-blue-600! text-blue-100!",
          warning: "bg-amber-600! text-amber-100!",
          error: "bg-rose-600! text-rose-100!",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-100" />,
        info: <InfoIcon className="size-4 text-blue-100" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-100" />,
        error: <OctagonXIcon className="size-4 text-rose-100" />,
        loading: (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ),
      }}
      {...props}
    />
  );
};

export { Toaster };
