import { ReactRenderer } from "@tiptap/react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";

export interface VariableItem {
  path: string;
  label: string;
  type?: "object" | "array" | "primitive";
  children?: VariableItem[];
}

interface SuggestionListProps {
  items: VariableItem[];
  command: (item: VariableItem) => void;
}

export const VariableSuggestionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SuggestionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [breadcrumb, setBreadcrumb] = useState<VariableItem[]>([]);
  const [currentItems, setCurrentItems] = useState<VariableItem[]>(props.items);

  useEffect(() => {
    setCurrentItems(props.items);
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = currentItems[index];

      if (!item) return;

      // If it has children, drill into it
      if (item.children && item.children.length > 0) {
        setBreadcrumb([...breadcrumb, item]);
        setCurrentItems(item.children);
        setSelectedIndex(0);
      } else {
        // It's a leaf node, insert it as a variable node
        // Pass the full item with path and label
        props.command({
          label: item.label,
          path: item.path,
        });
      }
    },
    [currentItems, breadcrumb, props]
  );

  const goBack = useCallback(() => {
    if (breadcrumb.length === 0) return;

    const newBreadcrumb = [...breadcrumb];
    newBreadcrumb.pop();
    setBreadcrumb(newBreadcrumb);

    // Navigate back to parent items
    let items = props.items;
    for (const crumb of newBreadcrumb) {
      items = crumb.children || [];
    }
    setCurrentItems(items);
    setSelectedIndex(0);
  }, [breadcrumb, props.items]);

  const upHandler = useCallback(() => {
    setSelectedIndex(
      (selectedIndex + currentItems.length - 1) % currentItems.length
    );
  }, [selectedIndex, currentItems.length]);

  const downHandler = useCallback(() => {
    setSelectedIndex((selectedIndex + 1) % currentItems.length);
  }, [selectedIndex, currentItems.length]);

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex);
  }, [selectItem, selectedIndex]);

  useEffect(() => setSelectedIndex(0), [currentItems]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      if (event.key === "Backspace" && breadcrumb.length > 0) {
        goBack();
        return true;
      }

      return false;
    },
  }), [upHandler, downHandler, enterHandler, breadcrumb.length, goBack]);

  return (
    <div className="z-50 min-w-[280px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md pointer-events-auto">
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 border-b px-3 py-2 text-xs text-muted-foreground">
          <button
            onClick={goBack}
            className="hover:text-foreground"
            type="button"
          >
            ← Back
          </button>
          <span className="ml-2">
            {breadcrumb.map((crumb) => crumb.label).join(" → ")}
          </span>
        </div>
      )}
      <div className="max-h-[300px] overflow-y-auto p-1">
        {currentItems.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No variables found
          </div>
        ) : (
          currentItems.map((item, index) => (
            <button
              key={item.path}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => selectItem(index)}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">@</span>
                <span>{item.label}</span>
              </span>
              {item.children && item.children.length > 0 && (
                <span className="text-xs text-muted-foreground">→</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
});

VariableSuggestionList.displayName = "VariableSuggestionList";

export const variableSuggestion = (items: VariableItem[]) => ({
  items: ({ query }: { query: string }) => {
    // Simple filtering - you can make this more sophisticated
    const filterItems = (items: VariableItem[]): VariableItem[] => {
      return items
        .filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase())
        )
        .map((item) => ({
          ...item,
          id: item.path, // Map path to id for Mention extension
          path: item.path, // Explicitly include path
          children: item.children ? filterItems(item.children) : undefined,
        }));
    };

    return query ? filterItems(items) : items;
  },

  render: () => {
    let component: ReactRenderer<any>;
    let popup: HTMLDivElement | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(VariableSuggestionList, {
          props: { ...props, items },
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.zIndex = "9999";
        document.body.appendChild(popup);
        popup.appendChild(component.element);

        const rect = props.clientRect();
        popup.style.top = `${rect.bottom + 8}px`;
        popup.style.left = `${rect.left}px`;
      },

      onUpdate(props: any) {
        component.updateProps({ ...props, items });

        if (!props.clientRect || !popup) {
          return;
        }

        const rect = props.clientRect();
        popup.style.top = `${rect.bottom + 8}px`;
        popup.style.left = `${rect.left}px`;
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          if (popup) {
            popup.remove();
          }
          return true;
        }

        return component.ref?.onKeyDown(props) || false;
      },

      onExit() {
        if (popup) {
          popup.remove();
        }
        component.destroy();
      },
    };
  },
});
