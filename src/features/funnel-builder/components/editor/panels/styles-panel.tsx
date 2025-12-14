"use client";

import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { deviceModeAtom, activePageIdAtom } from "../../../lib/editor-store";
import type { FunnelBlock, FunnelBreakpoint, DeviceType } from "@prisma/client";
import type { BlockStyles } from "../../../types";

interface StylesPanelProps {
  block: FunnelBlock & { breakpoints: FunnelBreakpoint[] };
}

export function StylesPanel({ block }: StylesPanelProps) {
  const [deviceMode] = useAtom(deviceModeAtom);
  const [activePageId] = useAtom(activePageIdAtom);

  // Get current styles (base or device-specific)
  const deviceBreakpoint = block.breakpoints.find(
    (bp) => bp.device === deviceMode
  );
  const currentStyles =
    deviceMode === "DESKTOP"
      ? ((block.styles as BlockStyles) || {})
      : ((deviceBreakpoint?.styles as BlockStyles) || {});

  const [styles, setStyles] = useState<BlockStyles>(currentStyles);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutate: updateBlockMutation } = useMutation(
    trpc.funnels.updateBlock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const { mutate: updateBreakpointMutation } = useMutation(
    trpc.funnels.updateBreakpoint.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  // Sync local state when block or device changes
  useEffect(() => {
    const newStyles =
      deviceMode === "DESKTOP"
        ? ((block.styles as BlockStyles) || {})
        : ((deviceBreakpoint?.styles as BlockStyles) || {});
    setStyles(newStyles);
  }, [block.id, deviceMode, block.styles, deviceBreakpoint]);

  const handleStyleChange = (key: keyof BlockStyles, value: any) => {
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);

    // Update based on device mode
    if (deviceMode === "DESKTOP") {
      updateBlockMutation({
        blockId: block.id,
        styles: newStyles,
      });
    } else {
      updateBreakpointMutation({
        blockId: block.id,
        device: deviceMode,
        styles: newStyles,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Styles</h3>
        <p className="text-xs text-muted-foreground">
          Editing for {deviceMode.toLowerCase()} view
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["layout", "spacing", "typography"]}>
        {/* LAYOUT */}
        <AccordionItem value="layout">
          <AccordionTrigger className="text-xs font-semibold">
            Layout
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-3">
            <StyleInput
              label="Display"
              type="select"
              value={styles.display || "block"}
              onChange={(v) => handleStyleChange("display", v)}
              options={[
                { label: "Block", value: "block" },
                { label: "Flex", value: "flex" },
                { label: "Grid", value: "grid" },
                { label: "Inline", value: "inline-block" },
                { label: "None", value: "none" },
              ]}
            />

            {styles.display === "flex" && (
              <>
                <StyleInput
                  label="Direction"
                  type="select"
                  value={styles.flexDirection || "row"}
                  onChange={(v) => handleStyleChange("flexDirection", v)}
                  options={[
                    { label: "Row", value: "row" },
                    { label: "Column", value: "column" },
                  ]}
                />

                <StyleInput
                  label="Justify"
                  type="select"
                  value={styles.justifyContent || "flex-start"}
                  onChange={(v) => handleStyleChange("justifyContent", v)}
                  options={[
                    { label: "Start", value: "flex-start" },
                    { label: "Center", value: "center" },
                    { label: "End", value: "flex-end" },
                    { label: "Space Between", value: "space-between" },
                    { label: "Space Around", value: "space-around" },
                  ]}
                />

                <StyleInput
                  label="Align"
                  type="select"
                  value={styles.alignItems || "stretch"}
                  onChange={(v) => handleStyleChange("alignItems", v)}
                  options={[
                    { label: "Start", value: "flex-start" },
                    { label: "Center", value: "center" },
                    { label: "End", value: "flex-end" },
                    { label: "Stretch", value: "stretch" },
                  ]}
                />

                <StyleInput
                  label="Gap"
                  type="number"
                  value={styles.gap || 0}
                  onChange={(v) => handleStyleChange("gap", Number(v))}
                  unit="px"
                />
              </>
            )}

            <StyleInput
              label="Width"
              type="text"
              value={styles.width || ""}
              onChange={(v) => handleStyleChange("width", v)}
              placeholder="auto, 100%, 500px"
            />

            <StyleInput
              label="Height"
              type="text"
              value={styles.height || ""}
              onChange={(v) => handleStyleChange("height", v)}
              placeholder="auto, 100%, 500px"
            />
          </AccordionContent>
        </AccordionItem>

        {/* SPACING */}
        <AccordionItem value="spacing">
          <AccordionTrigger className="text-xs font-semibold">
            Spacing
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-3">
            <StyleInput
              label="Padding"
              type="number"
              value={styles.padding || 0}
              onChange={(v) => handleStyleChange("padding", Number(v))}
              unit="px"
            />

            <div className="grid grid-cols-2 gap-2">
              <StyleInput
                label="Padding Top"
                type="number"
                value={styles.paddingTop}
                onChange={(v) => handleStyleChange("paddingTop", Number(v))}
                unit="px"
              />
              <StyleInput
                label="Padding Right"
                type="number"
                value={styles.paddingRight}
                onChange={(v) => handleStyleChange("paddingRight", Number(v))}
                unit="px"
              />
              <StyleInput
                label="Padding Bottom"
                type="number"
                value={styles.paddingBottom}
                onChange={(v) => handleStyleChange("paddingBottom", Number(v))}
                unit="px"
              />
              <StyleInput
                label="Padding Left"
                type="number"
                value={styles.paddingLeft}
                onChange={(v) => handleStyleChange("paddingLeft", Number(v))}
                unit="px"
              />
            </div>

            <StyleInput
              label="Margin"
              type="number"
              value={styles.margin || 0}
              onChange={(v) => handleStyleChange("margin", Number(v))}
              unit="px"
            />

            <div className="grid grid-cols-2 gap-2">
              <StyleInput
                label="Margin Top"
                type="number"
                value={styles.marginTop}
                onChange={(v) => handleStyleChange("marginTop", Number(v))}
                unit="px"
              />
              <StyleInput
                label="Margin Right"
                type="number"
                value={styles.marginRight}
                onChange={(v) => handleStyleChange("marginRight", Number(v))}
                unit="px"
              />
              <StyleInput
                label="Margin Bottom"
                type="number"
                value={styles.marginBottom}
                onChange={(v) => handleStyleChange("marginBottom", Number(v))}
                unit="px"
              />
              <StyleInput
                label="Margin Left"
                type="number"
                value={styles.marginLeft}
                onChange={(v) => handleStyleChange("marginLeft", Number(v))}
                unit="px"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* TYPOGRAPHY */}
        <AccordionItem value="typography">
          <AccordionTrigger className="text-xs font-semibold">
            Typography
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-3">
            <StyleInput
              label="Font Size"
              type="number"
              value={styles.fontSize || 16}
              onChange={(v) => handleStyleChange("fontSize", Number(v))}
              unit="px"
            />

            <StyleInput
              label="Font Weight"
              type="select"
              value={String(styles.fontWeight || 400)}
              onChange={(v) => handleStyleChange("fontWeight", Number(v))}
              options={[
                { label: "Light (300)", value: "300" },
                { label: "Normal (400)", value: "400" },
                { label: "Medium (500)", value: "500" },
                { label: "Semi Bold (600)", value: "600" },
                { label: "Bold (700)", value: "700" },
              ]}
            />

            <StyleInput
              label="Text Align"
              type="select"
              value={styles.textAlign || "left"}
              onChange={(v) => handleStyleChange("textAlign", v)}
              options={[
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
                { label: "Justify", value: "justify" },
              ]}
            />

            <StyleInput
              label="Color"
              type="color"
              value={styles.color || "#000000"}
              onChange={(v) => handleStyleChange("color", v)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* BACKGROUND */}
        <AccordionItem value="background">
          <AccordionTrigger className="text-xs font-semibold">
            Background
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-3">
            <StyleInput
              label="Background Color"
              type="color"
              value={styles.backgroundColor || "#ffffff"}
              onChange={(v) => handleStyleChange("backgroundColor", v)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* BORDER */}
        <AccordionItem value="border">
          <AccordionTrigger className="text-xs font-semibold">
            Border
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-3">
            <StyleInput
              label="Border Width"
              type="number"
              value={styles.borderWidth || 0}
              onChange={(v) => handleStyleChange("borderWidth", Number(v))}
              unit="px"
            />

            <StyleInput
              label="Border Style"
              type="select"
              value={styles.borderStyle || "solid"}
              onChange={(v) => handleStyleChange("borderStyle", v)}
              options={[
                { label: "Solid", value: "solid" },
                { label: "Dashed", value: "dashed" },
                { label: "Dotted", value: "dotted" },
                { label: "None", value: "none" },
              ]}
            />

            <StyleInput
              label="Border Color"
              type="color"
              value={styles.borderColor || "#000000"}
              onChange={(v) => handleStyleChange("borderColor", v)}
            />

            <StyleInput
              label="Border Radius"
              type="number"
              value={styles.borderRadius || 0}
              onChange={(v) => handleStyleChange("borderRadius", Number(v))}
              unit="px"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

interface StyleInputProps {
  label: string;
  type: "text" | "number" | "color" | "select";
  value: any;
  onChange: (value: any) => void;
  unit?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

function StyleInput({
  label,
  type,
  value,
  onChange,
  unit,
  placeholder,
  options,
}: StyleInputProps) {
  if (type === "select" && options) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <Select value={String(value)} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "color") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 h-8 p-1"
          />
          <Input
            type="text"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="h-8 text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input
          type={type}
          value={value === undefined || value === null ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        {unit && (
          <span className="flex items-center text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
