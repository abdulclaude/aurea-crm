import { ReactRenderer } from "@tiptap/react";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import type { SuggestionItem } from "./types";
import { ChevronRight } from "lucide-react";

interface SuggestionListProps {
  items: SuggestionItem[];
  command: (item: { id: string; label: string; type: string }) => void;
  isMention?: boolean;
}

// Group items by type for @ mentions or by category for / commands
function groupItemsByType(items: SuggestionItem[]) {
  const groups: Record<string, SuggestionItem[]> = {};

  for (const item of items) {
    // Use category if available (for / commands), otherwise use type (for @ mentions)
    const groupKey = item.category || item.type;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
  }

  return groups;
}

const typeLabels: Record<string, string> = {
  workflow: "Workflows",
  contact: "Contacts",
  deal: "Deals",
  pipeline: "Pipelines",
  action: "Actions",
  ai: "AI",
  query: "Query",
  // Category labels for slash commands
  Contacts: "Contacts",
  Deals: "Deals",
  Workflows: "Workflows",
  AI: "AI",
  Query: "Query",
};

const typeOrder = ["workflow", "contact", "deal", "pipeline", "Contacts", "Deals", "Workflows", "AI", "Query"];

export const ChatSuggestionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SuggestionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if this should show a grouped menu
  // Either @ mention menu OR / command menu with categories
  const isMentionMenu = props.items.some(item =>
    ["workflow", "contact", "deal", "pipeline"].includes(item.type)
  );
  const isCommandMenu = props.items.some(item => item.category);
  const shouldGroup = isMentionMenu || isCommandMenu;

  // Group items for mention menu or command menu
  const groupedItems = shouldGroup ? groupItemsByType(props.items) : null;
  const sortedGroups = groupedItems
    ? typeOrder.filter(type => groupedItems[type]?.length > 0)
    : [];

  // Flatten items for keyboard navigation when a group is expanded
  const flatItems = expandedType && groupedItems
    ? groupedItems[expandedType] || []
    : props.items;

  useEffect(() => {
    setSelectedIndex(0);
    setExpandedType(null);
  }, [props.items]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = itemRefs.current[selectedIndex];
    if (selectedElement && containerRef.current) {
      selectedElement.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const selectItem = useCallback(
    (index: number) => {
      const items = expandedType && groupedItems
        ? groupedItems[expandedType] || []
        : props.items;
      const item = items[index];
      if (!item) return;

      props.command({
        id: item.id,
        label: item.name,
        type: item.type,
      });
    },
    [props, expandedType, groupedItems]
  );

  const upHandler = useCallback(() => {
    const items = expandedType && groupedItems
      ? groupedItems[expandedType] || []
      : props.items;
    setSelectedIndex(
      (selectedIndex + items.length - 1) % items.length
    );
  }, [selectedIndex, props.items.length, expandedType, groupedItems]);

  const downHandler = useCallback(() => {
    const items = expandedType && groupedItems
      ? groupedItems[expandedType] || []
      : props.items;
    setSelectedIndex((selectedIndex + 1) % items.length);
  }, [selectedIndex, props.items.length, expandedType, groupedItems]);

  const enterHandler = useCallback(() => {
    if (shouldGroup && !expandedType) {
      // Expand the selected group
      const type = sortedGroups[selectedIndex];
      if (type) {
        setExpandedType(type);
        setSelectedIndex(0);
      }
    } else {
      selectItem(selectedIndex);
    }
  }, [selectItem, selectedIndex, shouldGroup, expandedType, sortedGroups]);

  const escapeHandler = useCallback(() => {
    if (expandedType) {
      // Go back to group selection
      setExpandedType(null);
      setSelectedIndex(sortedGroups.indexOf(expandedType) || 0);
      return true;
    }
    return false;
  }, [expandedType, sortedGroups]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          enterHandler();
          return true;
        }

        if (event.key === "Escape" || event.key === "ArrowLeft") {
          if (escapeHandler()) {
            event.preventDefault();
            return true;
          }
        }

        if (event.key === "ArrowRight" && shouldGroup && !expandedType) {
          enterHandler();
          return true;
        }

        return false;
      },
    }),
    [upHandler, downHandler, enterHandler, escapeHandler, shouldGroup, expandedType]
  );

  if (props.items.length === 0) {
    return null;
  }

  // Render grouped menu for @ mentions or / commands with categories
  if (shouldGroup && groupedItems && !expandedType) {
    return (
      <div className="z-50 min-w-[280px] overflow-hidden rounded-md border border-black/10 bg-popover text-popover-foreground shadow-md pointer-events-auto">
        <div ref={containerRef} className="max-h-[300px] overflow-y-auto p-1">
          {sortedGroups.map((type, index) => (
            <button
              key={type}
              ref={(el) => { itemRefs.current[index] = el; }}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => {
                setExpandedType(type);
                setSelectedIndex(0);
              }}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{typeLabels[type] || type}</span>
                <span className="text-xs text-muted-foreground">
                  ({groupedItems[type].length})
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Render expanded submenu or flat list for / commands
  const items = expandedType && groupedItems
    ? groupedItems[expandedType] || []
    : props.items;

  return (
    <div className="z-50 min-w-[280px] overflow-hidden rounded-md border border-black/10 bg-popover text-popover-foreground shadow-md pointer-events-auto">
      {expandedType && (
        <div className="border-b border-black/5 px-2 py-1.5">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setExpandedType(null);
              setSelectedIndex(sortedGroups.indexOf(expandedType) || 0);
            }}
          >
            ← {typeLabels[expandedType] || expandedType}
          </button>
        </div>
      )}
      <div ref={containerRef} className="max-h-[300px] overflow-y-auto p-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => { itemRefs.current[index] = el; }}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
            onClick={() => selectItem(index)}
          >
            {!expandedType && (
              <span className="text-xs text-muted-foreground uppercase w-16">
                {item.type}
              </span>
            )}
            <span className="truncate">{item.name}</span>
            {item.description && (
              <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">
                {item.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});

ChatSuggestionList.displayName = "ChatSuggestionList";

export const createChatSuggestion = (
  fetchItems: (query: string) => Promise<SuggestionItem[]>,
  activeRef?: React.MutableRefObject<boolean>
) => ({
  items: async ({ query }: { query: string }) => {
    return await fetchItems(query);
  },

  render: () => {
    let component: ReactRenderer<any>;
    let popup: HTMLDivElement | null = null;

    return {
      onStart: async (props: any) => {
        if (activeRef) activeRef.current = true;

        component = new ReactRenderer(ChatSuggestionList, {
          props,
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
        if (rect) {
          // Position below the cursor
          popup.style.top = `${rect.bottom + 8}px`;
          popup.style.left = `${rect.left}px`;
        }
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect || !popup) {
          return;
        }

        const rect = props.clientRect();
        if (rect) {
          popup.style.top = `${rect.bottom + 8}px`;
          popup.style.left = `${rect.left}px`;
        }
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          // Let the component handle escape first for going back in submenus
          const handled = component.ref?.onKeyDown(props);
          if (handled) return true;

          if (popup) {
            popup.remove();
          }
          return true;
        }

        return component.ref?.onKeyDown(props) || false;
      },

      onExit() {
        if (activeRef) activeRef.current = false;

        if (popup) {
          popup.remove();
        }
        component.destroy();
      },
    };
  },
});
