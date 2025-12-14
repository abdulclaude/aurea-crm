"use client";

import { useAtom } from "jotai";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  selectedBlockIdAtom,
  hoveredBlockIdAtom,
  hiddenBlockIdsAtom,
} from "../../lib/editor-store";
import { getBlockDefinition } from "../../lib/block-registry";
import type { FunnelBlock, FunnelBreakpoint, DeviceType } from "@prisma/client";
import type { BlockProps, BlockStyles } from "../../types";
import { useDroppable } from "@dnd-kit/core";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

interface BlockRendererProps {
  block: FunnelBlock & { breakpoints: FunnelBreakpoint[] };
  allBlocks: (FunnelBlock & { breakpoints: FunnelBreakpoint[] })[];
  deviceMode: DeviceType;
  isSelected: boolean;
  isHidden: boolean;
}

export function BlockRenderer({
  block,
  allBlocks,
  deviceMode,
  isSelected,
  isHidden,
}: BlockRendererProps) {
  const [, setSelectedBlockId] = useAtom(selectedBlockIdAtom);
  const [, setHoveredBlockId] = useAtom(hoveredBlockIdAtom);
  const trpc = useTRPC();

  const definition = getBlockDefinition(block.type);
  const canHaveChildren = definition?.canHaveChildren || false;

  // If this block is a smart section instance, fetch its blocks
  // Note: block should include smartSectionInstance.section from the query
  const smartSectionId = (block as any).smartSectionInstance?.sectionId;

  const { data: smartSectionBlocks, isLoading: isLoadingSmartSection } = useQuery({
    ...trpc.smartSections.getBlocks.queryOptions({
      sectionId: smartSectionId || "",
    }),
    enabled: !!smartSectionId,
  });

  // Setup sortable for dragging and dropping blocks
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: {
      type: "block",
      blockId: block.id,
      canHaveChildren,
    },
    disabled: block.locked || !!block.smartSectionInstanceId, // Disable dragging for smart section refs
  });

  // Setup droppable for container blocks (allows nesting)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `droppable-${block.id}`,
    data: {
      type: "block",
      blockId: block.id,
      canHaveChildren,
    },
    disabled: !canHaveChildren || !!block.smartSectionInstanceId, // Disable dropping for smart section refs
  });

  // Get child blocks - either from smart section or from regular children
  // For smart section instances, we need to get only the root-level blocks
  const childBlocks = block.smartSectionInstanceId
    ? (smartSectionBlocks || []).filter((b) => !b.parentBlockId).sort((a, b) => a.order - b.order)
    : allBlocks
        .filter((b) => b.parentBlockId === block.id)
        .sort((a, b) => a.order - b.order);

  // For smart section instances, use smartSectionBlocks as the allBlocks context
  // This ensures nested blocks can find their children
  const blocksContext = block.smartSectionInstanceId
    ? (smartSectionBlocks || [])
    : allBlocks;

  // Merge styles: base styles + device-specific overrides
  const baseStyles = (block.styles as BlockStyles) || {};
  const deviceBreakpoint = block.breakpoints.find(
    (bp) => bp.device === deviceMode
  );
  const deviceStyles = (deviceBreakpoint?.styles as BlockStyles) || {};
  const mergedStyles = { ...baseStyles, ...deviceStyles };

  const props = (block.props as BlockProps) || {};

  if (isHidden && !isSelected) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBlockId(block.id);
  };

  const handleMouseEnter = () => {
    setHoveredBlockId(block.id);
  };

  // Combine refs for drag and drop
  const setRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    if (canHaveChildren) {
      setDropRef(el);
    }
  };

  // Combine styles: block styles + drag transform
  const style = {
    ...convertStylesToCSS(mergedStyles),
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Show loading state for smart section instances
  if (block.smartSectionInstanceId && isLoadingSmartSection) {
    return (
      <div
        ref={setRefs}
        className={cn(
          "relative p-4 border-2 border-dashed border-blue-500 rounded-lg bg-blue-500/5",
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          Loading smart section...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setRefs}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "relative transition-all cursor-move",
        isSelected && "ring-2 ring-primary ring-offset-2",
        block.locked && "pointer-events-none cursor-not-allowed",
        isHidden && "opacity-30",
        isDragging && "opacity-50",
        isOver && canHaveChildren && "ring-2 ring-blue-400 ring-offset-2",
        block.smartSectionInstanceId && "border-2 border-dashed border-blue-500 rounded-lg bg-blue-500/5"
      )}
      style={style}
      data-block-id={block.id}
    >
      {/* Smart Section Badge */}
      {block.smartSectionInstanceId && (
        <div className="absolute -top-6 left-0 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-t-lg z-10 flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3 h-3"
          >
            <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
          </svg>
          Smart Section: {(block as any).smartSectionInstance?.section?.name || "Unnamed"}
        </div>
      )}

      {/* Render the actual block content */}
      <BlockContent
        type={block.type}
        props={props}
        styles={mergedStyles}
        childBlocks={childBlocks as any}
        allBlocks={blocksContext as any}
        deviceMode={deviceMode}
      />

      {/* Selection overlay */}
      {isSelected && !block.smartSectionInstanceId && (
        <div className="absolute -top-6 left-0 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-t-lg z-10">
          {definition?.label || block.type}
        </div>
      )}
    </div>
  );
}

interface BlockContentProps {
  type: FunnelBlock["type"];
  props: BlockProps;
  styles: BlockStyles;
  childBlocks: (FunnelBlock & { breakpoints: FunnelBreakpoint[] })[];
  allBlocks: (FunnelBlock & { breakpoints: FunnelBreakpoint[] })[];
  deviceMode: DeviceType;
}

function BlockContent({
  type,
  props,
  styles,
  childBlocks,
  allBlocks,
  deviceMode,
}: BlockContentProps) {
  const [selectedBlockId] = useAtom(selectedBlockIdAtom);
  const [hiddenBlockIds] = useAtom(hiddenBlockIdsAtom);

  // Render children for container blocks
  const renderChildren = () => {
    if (childBlocks.length === 0) {
      return null;
    }

    return (
      <SortableContext
        items={childBlocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        {childBlocks.map((child) => (
          <BlockRenderer
            key={child.id}
            block={child}
            allBlocks={allBlocks}
            deviceMode={deviceMode}
            isSelected={selectedBlockId === child.id}
            isHidden={hiddenBlockIds.has(child.id)}
          />
        ))}
      </SortableContext>
    );
  };

  // Render based on block type
  switch (type) {
    // LAYOUTS
    case "CONTAINER":
    case "ONE_COLUMN":
    case "SECTION":
      return <div>{renderChildren()}</div>;

    case "TWO_COLUMN":
    case "THREE_COLUMN":
    case "FEATURE_GRID":
      return <div>{renderChildren()}</div>;

    // TYPOGRAPHY
    case "HEADING": {
      const tag = (props.tag as string) || "h2";
      const HeadingTag = tag as keyof React.JSX.IntrinsicElements;
      return <HeadingTag>{props.text || "Heading"}</HeadingTag>;
    }

    case "PARAGRAPH":
      return <p>{props.text || "Paragraph text..."}</p>;

    case "LABEL":
      return <label>{props.text || "Label"}</label>;

    case "RICH_TEXT":
      return (
        <div
          dangerouslySetInnerHTML={{
            __html: (props.html as string) || "<p>Rich text...</p>",
          }}
        />
      );

    // MEDIA
    case "IMAGE":
      return (
        <img
          src={(props.src as string) || "https://via.placeholder.com/800x400"}
          alt={(props.alt as string) || "Image"}
          style={{ display: "block" }}
        />
      );

    case "VIDEO":
      return (
        <video
          src={props.src as string}
          poster={props.poster as string}
          controls={props.controls as boolean}
          autoPlay={props.autoplay as boolean}
          loop={props.loop as boolean}
          style={{ display: "block" }}
        />
      );

    case "ICON":
      return (
        <span
          style={{
            fontSize: typeof props.size === "number" ? props.size : 24,
            display: "inline-block",
          }}
        >
          ★
        </span>
      );

    // FORMS
    case "INPUT":
      return (
        <input
          type={(props.type as string) || "text"}
          placeholder={(props.placeholder as string) || ""}
          name={props.name as string}
          required={props.required as boolean}
        />
      );

    case "TEXTAREA":
      return (
        <textarea
          placeholder={(props.placeholder as string) || ""}
          name={props.name as string}
          rows={(props.rows as number) || 4}
          required={props.required as boolean}
        />
      );

    case "SELECT": {
      const options = ((props.options as string) || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      return (
        <select name={props.name as string} required={props.required as boolean}>
          <option value="">Select...</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    case "CHECKBOX":
      return (
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            name={props.name as string}
            required={props.required as boolean}
          />
          <span>{props.label || "Checkbox"}</span>
        </label>
      );

    case "BUTTON": {
      const buttonType = props.type as string;
      if (buttonType === "link") {
        return (
          <a
            href={(props.link as string) || "#"}
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            {props.text || "Button"}
          </a>
        );
      }
      return (
        <button type={buttonType === "submit" ? "submit" : "button"}>
          {props.text || "Button"}
        </button>
      );
    }

    case "FORM":
      return (
        <form onSubmit={(e) => e.preventDefault()}>
          {renderChildren()}
          <button type="submit" style={{ marginTop: "16px" }}>
            {props.submitText || "Submit"}
          </button>
        </form>
      );

    // COMPONENTS
    case "CARD":
      return <div>{renderChildren()}</div>;

    case "FAQ":
      return (
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            {props.question || "Question?"}
          </summary>
          <p style={{ marginTop: "8px" }}>{props.answer || "Answer..."}</p>
        </details>
      );

    case "TESTIMONIAL":
      return (
        <div>
          <blockquote style={{ fontStyle: "italic", marginBottom: "12px" }}>
            "{props.quote || "Testimonial quote..."}"
          </blockquote>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {props.avatar && (
              <img
                src={props.avatar as string}
                alt={props.author as string}
                style={{ width: 40, height: 40, borderRadius: "50%" }}
              />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{props.author || "Author"}</div>
              <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                {props.role || "Role"}
              </div>
            </div>
          </div>
        </div>
      );

    case "PRICING": {
      const features = ((props.features as string) || "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      return (
        <div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
            {props.title || "Plan Name"}
          </h3>
          <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "16px" }}>
            {props.price || "$99"}
            <span style={{ fontSize: "1rem", opacity: 0.7 }}>
              {props.period || "/month"}
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, marginBottom: "16px" }}>
            {features.map((feature, i) => (
              <li key={i} style={{ padding: "8px 0" }}>
                ✓ {feature}
              </li>
            ))}
          </ul>
          <a
            href={(props.buttonLink as string) || "#"}
            style={{
              display: "block",
              padding: "12px 24px",
              backgroundColor: "#3b82f6",
              color: "white",
              textAlign: "center",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            {props.buttonText || "Get Started"}
          </a>
        </div>
      );
    }

    // EMBEDS
    case "IFRAME":
      return (
        <iframe
          src={props.src as string}
          title={(props.title as string) || "Embedded content"}
          style={{ width: "100%", border: "none" }}
        />
      );

    case "CUSTOM_HTML":
      return (
        <div
          dangerouslySetInnerHTML={{
            __html: (props.html as string) || "<div>Custom HTML</div>",
          }}
        />
      );

    case "SCRIPT":
      // Scripts are hidden in editor
      return (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#f3f4f6",
            border: "1px dashed #d1d5db",
            borderRadius: "4px",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}
        >
          Script block (hidden in preview)
        </div>
      );

    // CONVERSION ENHANCERS
    case "POPUP": {
      // In editor, show popup as a centered container with overlay indicator
      return (
        <div
          style={{
            position: "relative",
            padding: "16px",
            backgroundColor: "#fef3c7",
            border: "2px dashed #fbbf24",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#92400e",
              marginBottom: "8px",
            }}
          >
            POPUP - Trigger: {props.trigger as string} {props.triggerValue && `(${props.triggerValue})`}
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px",
              borderRadius: "4px",
            }}
          >
            {renderChildren()}
          </div>
        </div>
      );
    }

    case "COUNTDOWN_TIMER": {
      // In editor, show a static timer preview
      const format = (props.format as string) || "HH:MM:SS";
      const sampleTime = format === "HH:MM:SS" ? "01:23:45" : format === "MM:SS" ? "23:45" : "1d 2h 30m";
      const textBefore = props.textBefore as string;

      return (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#dbeafe",
            border: "2px dashed #3b82f6",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#1e40af",
              marginBottom: "8px",
            }}
          >
            COUNTDOWN TIMER - Duration: {props.duration as number}s
          </div>
          {textBefore && (
            <div style={{ fontSize: "0.875rem", marginBottom: "8px" }}>
              {textBefore}
            </div>
          )}
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              fontFamily: "monospace",
              color: styles.color || "#000000",
            }}
          >
            {sampleTime}
          </div>
        </div>
      );
    }

    case "STICKY_BAR": {
      // In editor, show sticky bar with position indicator
      const position = (props.position as string) || "bottom";

      return (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#e0e7ff",
            border: "2px dashed #6366f1",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#3730a3",
              marginBottom: "8px",
            }}
          >
            STICKY BAR - Position: {position} {props.dismissible && "(dismissible)"}
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "12px 16px",
              borderRadius: "4px",
            }}
          >
            {renderChildren()}
          </div>
        </div>
      );
    }

    default:
      return (
        <div style={{ padding: "16px", border: "1px dashed #ccc" }}>
          Unknown block type: {type}
        </div>
      );
  }
}

// Convert our style object to CSS properties
function convertStylesToCSS(styles: BlockStyles): React.CSSProperties {
  const css: React.CSSProperties = {};

  Object.entries(styles).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    // Convert camelCase to kebab-case for CSS
    const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();

    // Handle numeric values that need units
    const numericProperties = [
      "padding",
      "margin",
      "width",
      "height",
      "fontSize",
      "borderWidth",
      "borderRadius",
      "gap",
      "top",
      "right",
      "bottom",
      "left",
    ];

    if (typeof value === "number" && numericProperties.includes(key)) {
      (css as any)[key] = `${value}px`;
    } else {
      (css as any)[key] = value;
    }
  });

  return css;
}
