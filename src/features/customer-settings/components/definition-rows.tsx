import * as React from "react";

export function DefinitionRows<Item extends { id: string }>({
  items,
  empty,
  render,
}: {
  items: Item[];
  empty: string;
  render: (item: Item) => React.ReactNode;
}): React.JSX.Element {
  if (items.length === 0)
    return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="divide-y border-y">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex min-h-14 items-center justify-between gap-3 py-2"
        >
          {render(item)}
        </div>
      ))}
    </div>
  );
}
