import type { FunnelBlockType, DeviceType } from "@prisma/client";

// Block property types
export interface BlockProps {
  [key: string]: string | number | boolean | undefined;
}

export interface BlockStyles {
  // Layout
  display?: "flex" | "block" | "inline-block" | "grid" | "none";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  gap?: number | string;
  gridTemplateColumns?: string;
  gridGap?: number | string;

  // Spacing
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  margin?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;

  // Sizing
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;

  // Typography
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number | string;
  textAlign?: "left" | "center" | "right" | "justify";
  color?: string;
  fontFamily?: string;
  letterSpacing?: string;
  textDecoration?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";

  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundPosition?: string;
  backgroundRepeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";

  // Border
  border?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  borderColor?: string;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;

  // Effects
  boxShadow?: string;
  opacity?: number;
  cursor?: string;
  overflow?: "visible" | "hidden" | "scroll" | "auto";

  // Position
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number;

  // Other
  [key: string]: string | number | undefined;
}

// Block definition in the registry
export interface BlockDefinition {
  type: FunnelBlockType;
  category:
    | "Layouts"
    | "Typography"
    | "Media"
    | "Forms"
    | "Components"
    | "Embeds"
    | "Conversion";
  label: string;
  icon?: string; // Icon name or component
  defaultProps: BlockProps;
  defaultStyles: BlockStyles;
  canHaveChildren?: boolean;
  allowedChildren?: FunnelBlockType[];
  propertySchema?: PropertySchema[];
  previewComponent?: React.ComponentType<{
    props: BlockProps;
    styles: BlockStyles;
  }>;
}

// Property editor schema
export type PropertyType =
  | "text"
  | "textarea"
  | "number"
  | "color"
  | "select"
  | "checkbox"
  | "url"
  | "image";

export interface PropertySchema {
  key: string;
  label: string;
  type: PropertyType;
  defaultValue?: unknown;
  options?: { label: string; value: string | number }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

// Canvas/Editor state
export interface EditorState {
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  device: DeviceType;
  isDragging: boolean;
  canvasZoom: number;
}

// Block with full hierarchy
export interface BlockTreeNode {
  id: string;
  type: FunnelBlockType;
  props: BlockProps;
  styles: BlockStyles;
  order: number;
  visible: boolean;
  locked: boolean;
  children: BlockTreeNode[];
  parentBlockId: string | null;
}
