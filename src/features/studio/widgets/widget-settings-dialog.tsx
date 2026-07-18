"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { WidgetType } from "@/db/enums";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  scheduleWidgetConfigSchema,
  type ScheduleWidgetConfig,
} from "@/features/studio/widgets/contracts";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type Widget = inferRouterOutputs<AppRouter>["widgets"]["list"]["widgets"][number];

function initialConfig(config: Widget["config"]): ScheduleWidgetConfig {
  const parsed = scheduleWidgetConfigSchema.safeParse(config);
  return parsed.success ? parsed.data : scheduleWidgetConfigSchema.parse({});
}

export function WidgetSettingsDialog({ widget }: { widget: Widget }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(widget.name);
  const [config, setConfig] = useState(() => initialConfig(widget.config));
  const classTypes = useQuery(trpc.classTypes.list.queryOptions({}));
  const update = useMutation(trpc.widgets.update.mutationOptions());

  const patchConfig = (patch: Partial<ScheduleWidgetConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  async function save() {
    try {
      await update.mutateAsync({
        id: widget.id,
        name: name.trim(),
        type: WidgetType.SCHEDULE,
        config,
      });
      await queryClient.invalidateQueries(trpc.widgets.list.queryOptions());
      setOpen(false);
      toast.success("Widget saved. Republish to update the live embed.");
    } catch {
      toast.error("Could not save widget settings");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setName(widget.name);
          setConfig(initialConfig(widget.config));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Configure ${widget.name}`} title="Configure widget">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule widget settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <Field label="Widget name" htmlFor={`widget-name-${widget.id}`}>
            <Input
              id={`widget-name-${widget.id}`}
              value={name}
              className="shadow-none"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Primary"
              value={config.primaryColor}
              onChange={(primaryColor) => patchConfig({ primaryColor })}
            />
            <ColorField
              label="Accent"
              value={config.accentColor}
              onChange={(accentColor) => patchConfig({ accentColor })}
            />
          </div>
          <Field label="Font" htmlFor={`widget-font-${widget.id}`}>
            <Select
              value={config.fontFamily}
              onValueChange={(fontFamily: ScheduleWidgetConfig["fontFamily"]) =>
                patchConfig({ fontFamily })
              }
            >
              <SelectTrigger id={`widget-font-${widget.id}`} className="shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Inter", "Arial", "Georgia", "system-ui"] as const).map((font) => (
                  <SelectItem key={font} value={font}>{font}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <RangeField
            label={`Days ahead: ${config.maxDaysAhead}`}
            value={config.maxDaysAhead}
            min={1}
            max={90}
            onChange={(maxDaysAhead) => patchConfig({ maxDaysAhead })}
          />
          <RangeField
            label={`Corner radius: ${config.borderRadius}px`}
            value={config.borderRadius}
            min={0}
            max={24}
            onChange={(borderRadius) => patchConfig({ borderRadius })}
          />
          <ToggleField
            id={`widget-prices-${widget.id}`}
            label="Show prices"
            checked={config.showPrices}
            onCheckedChange={(showPrices) => patchConfig({ showPrices })}
          />
          <ToggleField
            id={`widget-instructors-${widget.id}`}
            label="Show instructors"
            checked={config.showInstructors}
            onCheckedChange={(showInstructors) => patchConfig({ showInstructors })}
          />
          <div className="space-y-2">
            <Label>Class types</Label>
            <div className="max-h-36 space-y-2 overflow-y-auto border-y py-2">
              {(classTypes.data ?? []).map((classType) => {
                const checked = config.classTypeIds.includes(classType.id);
                return (
                  <label key={classType.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => patchConfig({
                        classTypeIds: next
                          ? [...config.classTypeIds, classType.id]
                          : config.classTypeIds.filter((id) => id !== classType.id),
                      })}
                    />
                    <span>{classType.name}</span>
                  </label>
                );
              })}
              {!classTypes.isLoading && !classTypes.data?.length ? (
                <p className="text-xs text-muted-foreground">No active class types.</p>
              ) : null}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={update.isPending || !name.trim()} onClick={save}>
            {update.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label} htmlFor={`color-${label.toLowerCase()}`}><Input id={`color-${label.toLowerCase()}`} type="color" value={value} className="h-10 w-full cursor-pointer p-1 shadow-none" onChange={(event) => onChange(event.target.value)} /></Field>;
}

function RangeField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="space-y-3"><Label>{label}</Label><Slider value={[value]} min={min} max={max} step={1} onValueChange={([next]) => next !== undefined && onChange(next)} /></div>;
}

function ToggleField({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between"><Label htmlFor={id}>{label}</Label><Switch id={id} checked={checked} onCheckedChange={onCheckedChange} /></div>;
}
