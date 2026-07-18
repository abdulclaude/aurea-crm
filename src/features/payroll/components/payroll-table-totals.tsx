export type PayrollTotalItem = {
  label: string;
  value: string;
};

export function PayrollTableTotals({
  items,
}: {
  items: PayrollTotalItem[];
}): React.JSX.Element {
  return (
    <dl
      aria-label="Payroll totals"
      className="grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-6 gap-y-4 border-t border-black/5 bg-primary-foreground/35 px-6 py-4 dark:border-white/5"
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[10px] text-primary/45">{item.label}</dt>
          <dd className="mt-1 text-xs font-semibold tabular-nums text-primary">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
