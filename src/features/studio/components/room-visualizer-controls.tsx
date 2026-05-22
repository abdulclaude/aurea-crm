"use client";

import { Maximize2, Save } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  densityOptions,
  equipmentOptions,
  getRoomLayoutStats,
  layoutPatternOptions,
  normalizeRoomVisualizerConfig,
  type RoomDensity,
  type RoomEquipmentType,
  type RoomLayoutPattern,
  type RoomVisualizerConfig,
  studioThemeOptions,
  type StudioTheme,
} from "@/features/studio/lib/room-visualizer";

type RoomVisualizerControlsProps = {
  config: RoomVisualizerConfig;
  capacity?: number | null;
  isSaving?: boolean;
  onChange: (config: RoomVisualizerConfig) => void;
  onSave: () => void;
};

export function RoomVisualizerControls({
  config,
  capacity,
  isSaving,
  onChange,
  onSave,
}: RoomVisualizerControlsProps) {
  const stats = getRoomLayoutStats(config);
  const capacityDelta = capacity ? config.spaceCount - capacity : 0;

  const update = (patch: Partial<RoomVisualizerConfig>) => {
    onChange(normalizeRoomVisualizerConfig({ ...config, ...patch }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-black/5 bg-background dark:border-white/5">
      <div className="space-y-2 border-b border-black/5 px-5 py-4 dark:border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">Layout controls</p>
            <p className="text-xs text-primary/55">
              {stats.columns} columns x {config.rows} rows · {config.spaceCount} spaces
            </p>
          </div>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            <Save className="size-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
        {capacity ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{capacity} room capacity</Badge>
            {capacityDelta === 0 ? (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                Matches capacity
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                {Math.abs(capacityDelta)} {capacityDelta > 0 ? "over" : "under"} capacity
              </Badge>
            )}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <ControlSection title="Class setup">
          <Field label="Equipment model">
            <Select
              value={config.equipment}
              onValueChange={(value) => update({ equipment: value as RoomEquipmentType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {equipmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Layout pattern">
            <Select
              value={config.pattern}
              onValueChange={(value) => update({ pattern: value as RoomLayoutPattern })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layoutPatternOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={
              <span className="flex items-center justify-between gap-3">
                <span>Spaces</span>
                <span className="tabular-nums text-primary/50">{config.spaceCount}</span>
              </span>
            }
          >
            <Slider
              value={[config.spaceCount]}
              min={1}
              max={80}
              step={1}
              onValueChange={(value) => update({ spaceCount: value[0] ?? 1 })}
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                type="number"
                min={1}
                max={80}
                value={config.spaceCount}
                onChange={(event) => update({ spaceCount: Number(event.target.value) })}
              />
              <Button
                variant="outline"
                disabled={!capacity}
                onClick={() => update({ spaceCount: capacity ?? config.spaceCount })}
              >
                Match capacity
              </Button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rows">
              <Input
                type="number"
                min={1}
                max={12}
                value={config.rows}
                onChange={(event) => update({ rows: Number(event.target.value) })}
              />
            </Field>
            <Field label="Spacing">
              <Select
                value={config.density}
                onValueChange={(value) => update({ density: value as RoomDensity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {densityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </ControlSection>

        <ControlSection title="Studio finish">
          <Field label="Visual style">
            <Select
              value={config.theme}
              onValueChange={(value) => update({ theme: value as StudioTheme })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {studioThemeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <ToggleRow
            label="Clearance zones"
            checked={config.showClearance}
            onChange={(checked) => update({ showClearance: checked })}
          />
          <ToggleRow
            label="Instructor area"
            checked={config.showInstructorZone}
            onChange={(checked) => update({ showInstructorZone: checked })}
          />
          <ToggleRow
            label="Mirrors"
            checked={config.showMirrors}
            onChange={(checked) => update({ showMirrors: checked })}
          />
          <ToggleRow
            label="Windows"
            checked={config.showWindows}
            onChange={(checked) => update({ showWindows: checked })}
          />
          <ToggleRow
            label="Storage wall"
            checked={config.showStorage}
            onChange={(checked) => update({ showStorage: checked })}
          />
        </ControlSection>

        <ControlSection title="Footprint">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Room width" value={`${stats.roomWidth.toFixed(1)}m`} />
            <Metric label="Room depth" value={`${stats.roomDepth.toFixed(1)}m`} />
            <Metric label="Model width" value={`${stats.footprintWidth.toFixed(1)}m`} />
            <Metric label="Model depth" value={`${stats.footprintDepth.toFixed(1)}m`} />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-black/5 bg-primary-foreground/40 p-3 text-xs text-primary/60 dark:border-white/5">
            <Maximize2 className="mt-0.5 size-3.5 shrink-0" />
            <p>
              The 3D layout is scaled from the selected equipment and spacing. Reformer
              layouts reserve larger movement zones than mats or bikes.
            </p>
          </div>
        </ControlSection>
      </div>
    </div>
  );
}

function ControlSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-primary/45">{title}</p>
        <Separator className="-mx-5 w-[calc(100%+2.5rem)] bg-black/5 dark:bg-white/5" />
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-primary/70">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-primary/70">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/5 bg-background p-3 dark:border-white/5">
      <p className="text-[11px] text-primary/45">{label}</p>
      <p className="mt-1 font-medium text-primary">{value}</p>
    </div>
  );
}
