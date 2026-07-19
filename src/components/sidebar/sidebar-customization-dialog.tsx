"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useSidebarPreferences } from "./sidebar-preferences";
import type { SidebarGroup, SidebarItem } from "./sidebar-types";

type SidebarCustomizationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: SidebarGroup[];
  standaloneItems: SidebarItem[];
};

export function SidebarCustomizationDialog({
  open,
  onOpenChange,
  groups,
  standaloneItems,
}: SidebarCustomizationDialogProps): React.JSX.Element {
  const {
    width,
    isGroupVisible,
    isItemVisible,
    setGroupVisible,
    setItemVisible,
    resetPreferences,
  } = useSidebarPreferences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Customize sidebar</DialogTitle>
          <DialogDescription>
            Choose what appears in your sidebar. Drag its right edge to resize it.
          </DialogDescription>
          <p className="pt-1 text-[11px] tabular-nums text-primary/45">
            Current width: {width}px
          </p>
        </DialogHeader>

        <Separator className="bg-black/5 dark:bg-white/5" />

        <div className="space-y-5 overflow-y-auto p-6">
          {standaloneItems.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold text-primary/70">
                Main links
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {standaloneItems.map((item) => (
                  <label
                    key={item.url}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/5 px-3 py-2 text-xs text-primary/70 dark:border-white/5"
                  >
                    <Checkbox
                      checked={isItemVisible(item.url)}
                      onCheckedChange={(checked) =>
                        setItemVisible(item.url, checked === true)
                      }
                    />
                    <item.icon className="size-3.5 text-primary/50" />
                    <span className="truncate">{item.title}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {groups.map((group) => {
            const groupVisible = isGroupVisible(group.title);
            return (
              <section
                key={group.title}
                className="rounded-xl border border-black/10 dark:border-white/10"
              >
                <label className="flex cursor-pointer items-center gap-2.5 px-4 py-3">
                  <Checkbox
                    checked={groupVisible}
                    onCheckedChange={(checked) =>
                      setGroupVisible(group.title, checked === true)
                    }
                  />
                  <group.icon className="size-4 text-primary/55" />
                  <span className="text-xs font-semibold text-primary/80">
                    {group.title}
                  </span>
                </label>
                <div className="border-t border-black/5 px-4 py-2 dark:border-white/5">
                  {group.items.map((item) => (
                    <label
                      key={item.url}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-6 py-2 text-xs text-primary/60 hover:bg-primary-foreground/50"
                    >
                      <Checkbox
                        checked={isItemVisible(item.url)}
                        disabled={!groupVisible}
                        onCheckedChange={(checked) =>
                          setItemVisible(item.url, checked === true)
                        }
                      />
                      <item.icon className="size-3.5 text-primary/45" />
                      <span>{item.title}</span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <DialogFooter className="border-t border-black/5 p-4 dark:border-white/5">
          <Button variant="ghost" size="sm" onClick={resetPreferences}>
            Reset to defaults
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
