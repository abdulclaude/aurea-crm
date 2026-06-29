"use client";

import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  children: ReactNode;
};

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="space-y-5 border-b border-black/5 px-6 pb-6 dark:border-white/5">
      <h2 className="text-sm font-medium text-primary">{title}</h2>
      {children}
    </section>
  );
}

