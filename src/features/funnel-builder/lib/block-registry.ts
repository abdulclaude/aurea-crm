import type { BlockDefinition } from "../types";
import { FunnelBlockType } from "@prisma/client";

/**
 * Block Registry - Central configuration for all funnel builder blocks
 *
 * This registry defines:
 * - Default properties and styles for each block type
 * - Which blocks can have children
 * - Which blocks can be dropped into which containers
 * - Property editor schemas
 */
export const BlockRegistry: Record<FunnelBlockType, BlockDefinition> = {
  // ========================================
  // LAYOUTS
  // ========================================
  [FunnelBlockType.CONTAINER]: {
    type: FunnelBlockType.CONTAINER,
    category: "Layouts",
    label: "Container",
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: 24,
      width: "100%",
    },
    canHaveChildren: true,
    propertySchema: [
      {
        key: "direction",
        label: "Direction",
        type: "select",
        defaultValue: "column",
        options: [
          { label: "Vertical", value: "column" },
          { label: "Horizontal", value: "row" },
        ],
      },
    ],
  },

  [FunnelBlockType.ONE_COLUMN]: {
    type: FunnelBlockType.ONE_COLUMN,
    category: "Layouts",
    label: "1 Column",
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      width: "100%",
      maxWidth: "1200px",
      margin: "0 auto",
      padding: 24,
    },
    canHaveChildren: true,
  },

  [FunnelBlockType.TWO_COLUMN]: {
    type: FunnelBlockType.TWO_COLUMN,
    category: "Layouts",
    label: "2 Columns",
    defaultProps: {
      columnRatio: "1:1",
    },
    defaultStyles: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "24px",
      width: "100%",
      padding: 24,
    },
    canHaveChildren: true,
    propertySchema: [
      {
        key: "columnRatio",
        label: "Column Ratio",
        type: "select",
        defaultValue: "1:1",
        options: [
          { label: "Equal (1:1)", value: "1:1" },
          { label: "Left Wider (2:1)", value: "2:1" },
          { label: "Right Wider (1:2)", value: "1:2" },
          { label: "Heavy Left (3:1)", value: "3:1" },
          { label: "Heavy Right (1:3)", value: "1:3" },
        ],
      },
    ],
  },

  [FunnelBlockType.THREE_COLUMN]: {
    type: FunnelBlockType.THREE_COLUMN,
    category: "Layouts",
    label: "3 Columns",
    defaultProps: {},
    defaultStyles: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "24px",
      width: "100%",
      padding: 24,
    },
    canHaveChildren: true,
  },

  [FunnelBlockType.SECTION]: {
    type: FunnelBlockType.SECTION,
    category: "Layouts",
    label: "Section",
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      width: "100%",
      padding: 64,
      backgroundColor: "#ffffff",
    },
    canHaveChildren: true,
    propertySchema: [
      {
        key: "backgroundColor",
        label: "Background Color",
        type: "color",
        defaultValue: "#ffffff",
      },
    ],
  },

  // ========================================
  // TYPOGRAPHY
  // ========================================
  [FunnelBlockType.HEADING]: {
    type: FunnelBlockType.HEADING,
    category: "Typography",
    label: "Heading",
    defaultProps: {
      text: "Heading",
      tag: "h2",
    },
    defaultStyles: {
      fontSize: 32,
      fontWeight: 700,
      lineHeight: 1.2,
      color: "#000000",
      marginBottom: 16,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "text",
        label: "Text",
        type: "text",
        defaultValue: "Heading",
      },
      {
        key: "tag",
        label: "HTML Tag",
        type: "select",
        defaultValue: "h2",
        options: [
          { label: "H1", value: "h1" },
          { label: "H2", value: "h2" },
          { label: "H3", value: "h3" },
          { label: "H4", value: "h4" },
          { label: "H5", value: "h5" },
          { label: "H6", value: "h6" },
        ],
      },
    ],
  },

  [FunnelBlockType.PARAGRAPH]: {
    type: FunnelBlockType.PARAGRAPH,
    category: "Typography",
    label: "Paragraph",
    defaultProps: {
      text: "This is a paragraph. Click to edit.",
    },
    defaultStyles: {
      fontSize: 16,
      lineHeight: 1.6,
      color: "#333333",
      marginBottom: 16,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "text",
        label: "Text",
        type: "textarea",
        defaultValue: "This is a paragraph. Click to edit.",
      },
    ],
  },

  [FunnelBlockType.LABEL]: {
    type: FunnelBlockType.LABEL,
    category: "Typography",
    label: "Label",
    defaultProps: {
      text: "Label",
    },
    defaultStyles: {
      fontSize: 14,
      fontWeight: 600,
      color: "#666666",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "text",
        label: "Text",
        type: "text",
        defaultValue: "Label",
      },
    ],
  },

  [FunnelBlockType.RICH_TEXT]: {
    type: FunnelBlockType.RICH_TEXT,
    category: "Typography",
    label: "Rich Text",
    defaultProps: {
      html: "<p>Rich text content...</p>",
    },
    defaultStyles: {
      fontSize: 16,
      lineHeight: 1.6,
      color: "#333333",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "html",
        label: "HTML Content",
        type: "textarea",
        defaultValue: "<p>Rich text content...</p>",
      },
    ],
  },

  // ========================================
  // MEDIA
  // ========================================
  [FunnelBlockType.IMAGE]: {
    type: FunnelBlockType.IMAGE,
    category: "Media",
    label: "Image",
    defaultProps: {
      src: "https://via.placeholder.com/800x400",
      alt: "Placeholder image",
    },
    defaultStyles: {
      width: "100%",
      height: "auto",
      borderRadius: 8,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "src",
        label: "Image URL",
        type: "url",
        defaultValue: "https://via.placeholder.com/800x400",
      },
      {
        key: "alt",
        label: "Alt Text",
        type: "text",
        defaultValue: "Placeholder image",
      },
    ],
  },

  [FunnelBlockType.VIDEO]: {
    type: FunnelBlockType.VIDEO,
    category: "Media",
    label: "Video",
    defaultProps: {
      src: "",
      poster: "",
      autoplay: false,
      loop: false,
      controls: true,
    },
    defaultStyles: {
      width: "100%",
      height: "auto",
      borderRadius: 8,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "src",
        label: "Video URL",
        type: "url",
        defaultValue: "",
      },
      {
        key: "poster",
        label: "Poster Image URL",
        type: "url",
        defaultValue: "",
      },
      {
        key: "autoplay",
        label: "Autoplay",
        type: "checkbox",
        defaultValue: false,
      },
      {
        key: "loop",
        label: "Loop",
        type: "checkbox",
        defaultValue: false,
      },
      {
        key: "controls",
        label: "Show Controls",
        type: "checkbox",
        defaultValue: true,
      },
    ],
  },

  [FunnelBlockType.ICON]: {
    type: FunnelBlockType.ICON,
    category: "Media",
    label: "Icon",
    defaultProps: {
      name: "star",
      size: 24,
    },
    defaultStyles: {
      fontSize: 24,
      color: "#000000",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "name",
        label: "Icon Name",
        type: "text",
        defaultValue: "star",
      },
      {
        key: "size",
        label: "Size",
        type: "number",
        defaultValue: 24,
        min: 12,
        max: 128,
      },
    ],
  },

  // ========================================
  // FORMS
  // ========================================
  [FunnelBlockType.INPUT]: {
    type: FunnelBlockType.INPUT,
    category: "Forms",
    label: "Input",
    defaultProps: {
      type: "text",
      placeholder: "Enter text...",
      name: "input",
      required: false,
    },
    defaultStyles: {
      width: "100%",
      padding: 12,
      fontSize: 16,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#cccccc",
      borderRadius: 4,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "type",
        label: "Input Type",
        type: "select",
        defaultValue: "text",
        options: [
          { label: "Text", value: "text" },
          { label: "Email", value: "email" },
          { label: "Password", value: "password" },
          { label: "Number", value: "number" },
          { label: "Tel", value: "tel" },
          { label: "URL", value: "url" },
        ],
      },
      {
        key: "placeholder",
        label: "Placeholder",
        type: "text",
        defaultValue: "Enter text...",
      },
      {
        key: "name",
        label: "Field Name",
        type: "text",
        defaultValue: "input",
      },
      {
        key: "required",
        label: "Required",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },

  [FunnelBlockType.TEXTAREA]: {
    type: FunnelBlockType.TEXTAREA,
    category: "Forms",
    label: "Textarea",
    defaultProps: {
      placeholder: "Enter your message...",
      name: "message",
      rows: 4,
      required: false,
    },
    defaultStyles: {
      width: "100%",
      padding: 12,
      fontSize: 16,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#cccccc",
      borderRadius: 4,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "placeholder",
        label: "Placeholder",
        type: "text",
        defaultValue: "Enter your message...",
      },
      {
        key: "name",
        label: "Field Name",
        type: "text",
        defaultValue: "message",
      },
      {
        key: "rows",
        label: "Rows",
        type: "number",
        defaultValue: 4,
        min: 2,
        max: 20,
      },
      {
        key: "required",
        label: "Required",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },

  [FunnelBlockType.SELECT]: {
    type: FunnelBlockType.SELECT,
    category: "Forms",
    label: "Select",
    defaultProps: {
      name: "select",
      options: "Option 1,Option 2,Option 3",
      required: false,
    },
    defaultStyles: {
      width: "100%",
      padding: 12,
      fontSize: 16,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#cccccc",
      borderRadius: 4,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "name",
        label: "Field Name",
        type: "text",
        defaultValue: "select",
      },
      {
        key: "options",
        label: "Options (comma-separated)",
        type: "textarea",
        defaultValue: "Option 1,Option 2,Option 3",
      },
      {
        key: "required",
        label: "Required",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },

  [FunnelBlockType.CHECKBOX]: {
    type: FunnelBlockType.CHECKBOX,
    category: "Forms",
    label: "Checkbox",
    defaultProps: {
      name: "checkbox",
      label: "I agree to the terms and conditions",
      required: false,
    },
    defaultStyles: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 16,
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "name",
        label: "Field Name",
        type: "text",
        defaultValue: "checkbox",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        defaultValue: "I agree to the terms and conditions",
      },
      {
        key: "required",
        label: "Required",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },

  [FunnelBlockType.BUTTON]: {
    type: FunnelBlockType.BUTTON,
    category: "Forms",
    label: "Button",
    defaultProps: {
      text: "Click Me",
      type: "button",
      link: "",
    },
    defaultStyles: {
      padding: 16,
      fontSize: 16,
      fontWeight: 600,
      color: "#ffffff",
      backgroundColor: "#3b82f6",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "text",
        label: "Button Text",
        type: "text",
        defaultValue: "Click Me",
      },
      {
        key: "type",
        label: "Button Type",
        type: "select",
        defaultValue: "button",
        options: [
          { label: "Button", value: "button" },
          { label: "Submit", value: "submit" },
          { label: "Link", value: "link" },
        ],
      },
      {
        key: "link",
        label: "Link URL (for link type)",
        type: "url",
        defaultValue: "",
      },
    ],
  },

  [FunnelBlockType.FORM]: {
    type: FunnelBlockType.FORM,
    category: "Forms",
    label: "Form",
    defaultProps: {
      name: "contact-form",
      submitText: "Submit",
    },
    defaultStyles: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      width: "100%",
      padding: 24,
      backgroundColor: "#f9fafb",
      borderRadius: 8,
    },
    canHaveChildren: true,
    allowedChildren: [
      FunnelBlockType.INPUT,
      FunnelBlockType.TEXTAREA,
      FunnelBlockType.SELECT,
      FunnelBlockType.CHECKBOX,
      FunnelBlockType.BUTTON,
      FunnelBlockType.HEADING,
      FunnelBlockType.PARAGRAPH,
    ],
    propertySchema: [
      {
        key: "name",
        label: "Form Name",
        type: "text",
        defaultValue: "contact-form",
      },
      {
        key: "submitText",
        label: "Submit Button Text",
        type: "text",
        defaultValue: "Submit",
      },
    ],
  },

  // ========================================
  // COMPONENTS
  // ========================================
  [FunnelBlockType.CARD]: {
    type: FunnelBlockType.CARD,
    category: "Components",
    label: "Card",
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      padding: 24,
      backgroundColor: "#ffffff",
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#e5e7eb",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    canHaveChildren: true,
  },

  [FunnelBlockType.FAQ]: {
    type: FunnelBlockType.FAQ,
    category: "Components",
    label: "FAQ",
    defaultProps: {
      question: "Frequently Asked Question?",
      answer: "This is the answer to the question.",
    },
    defaultStyles: {
      padding: 16,
      backgroundColor: "#ffffff",
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#e5e7eb",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "question",
        label: "Question",
        type: "text",
        defaultValue: "Frequently Asked Question?",
      },
      {
        key: "answer",
        label: "Answer",
        type: "textarea",
        defaultValue: "This is the answer to the question.",
      },
    ],
  },

  [FunnelBlockType.TESTIMONIAL]: {
    type: FunnelBlockType.TESTIMONIAL,
    category: "Components",
    label: "Testimonial",
    defaultProps: {
      quote: "This product changed my life!",
      author: "John Doe",
      role: "CEO, Company",
      avatar: "",
    },
    defaultStyles: {
      padding: 24,
      backgroundColor: "#ffffff",
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#e5e7eb",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "quote",
        label: "Quote",
        type: "textarea",
        defaultValue: "This product changed my life!",
      },
      {
        key: "author",
        label: "Author Name",
        type: "text",
        defaultValue: "John Doe",
      },
      {
        key: "role",
        label: "Author Role",
        type: "text",
        defaultValue: "CEO, Company",
      },
      {
        key: "avatar",
        label: "Avatar URL",
        type: "url",
        defaultValue: "",
      },
    ],
  },

  [FunnelBlockType.PRICING]: {
    type: FunnelBlockType.PRICING,
    category: "Components",
    label: "Pricing",
    defaultProps: {
      title: "Pro Plan",
      price: "$99",
      period: "/month",
      features: "Feature 1,Feature 2,Feature 3",
      buttonText: "Get Started",
      buttonLink: "",
    },
    defaultStyles: {
      padding: 32,
      backgroundColor: "#ffffff",
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: "#e5e7eb",
      textAlign: "center",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "title",
        label: "Plan Name",
        type: "text",
        defaultValue: "Pro Plan",
      },
      {
        key: "price",
        label: "Price",
        type: "text",
        defaultValue: "$99",
      },
      {
        key: "period",
        label: "Period",
        type: "text",
        defaultValue: "/month",
      },
      {
        key: "features",
        label: "Features (comma-separated)",
        type: "textarea",
        defaultValue: "Feature 1,Feature 2,Feature 3",
      },
      {
        key: "buttonText",
        label: "Button Text",
        type: "text",
        defaultValue: "Get Started",
      },
      {
        key: "buttonLink",
        label: "Button Link",
        type: "url",
        defaultValue: "",
      },
    ],
  },

  [FunnelBlockType.FEATURE_GRID]: {
    type: FunnelBlockType.FEATURE_GRID,
    category: "Components",
    label: "Feature Grid",
    defaultProps: {
      columns: 3,
    },
    defaultStyles: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "24px",
      padding: 24,
    },
    canHaveChildren: true,
    propertySchema: [
      {
        key: "columns",
        label: "Number of Columns",
        type: "select",
        defaultValue: 3,
        options: [
          { label: "2 Columns", value: 2 },
          { label: "3 Columns", value: 3 },
          { label: "4 Columns", value: 4 },
        ],
      },
    ],
  },

  // ========================================
  // EMBEDS
  // ========================================
  [FunnelBlockType.IFRAME]: {
    type: FunnelBlockType.IFRAME,
    category: "Embeds",
    label: "iFrame",
    defaultProps: {
      src: "",
      title: "Embedded content",
    },
    defaultStyles: {
      width: "100%",
      height: 400,
      borderRadius: 8,
      border: "none",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "src",
        label: "iFrame URL",
        type: "url",
        defaultValue: "",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        defaultValue: "Embedded content",
      },
    ],
  },

  [FunnelBlockType.CUSTOM_HTML]: {
    type: FunnelBlockType.CUSTOM_HTML,
    category: "Embeds",
    label: "Custom HTML",
    defaultProps: {
      html: "<div>Custom HTML content</div>",
    },
    defaultStyles: {
      width: "100%",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "html",
        label: "HTML Code",
        type: "textarea",
        defaultValue: "<div>Custom HTML content</div>",
      },
    ],
  },

  [FunnelBlockType.SCRIPT]: {
    type: FunnelBlockType.SCRIPT,
    category: "Embeds",
    label: "Script",
    defaultProps: {
      script: "// Your JavaScript code here",
    },
    defaultStyles: {
      display: "none",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "script",
        label: "JavaScript Code",
        type: "textarea",
        defaultValue: "// Your JavaScript code here",
      },
    ],
  },

  // ========================================
  // CONVERSION ENHANCERS
  // ========================================
  [FunnelBlockType.POPUP]: {
    type: FunnelBlockType.POPUP,
    category: "Components",
    label: "Popup / Modal",
    defaultProps: {
      trigger: "exitIntent", // exitIntent, scroll, time, button
      triggerValue: "50", // scroll %, delay seconds, button ID
      overlay: true,
      overlayColor: "rgba(0, 0, 0, 0.7)",
      closeButton: true,
      position: "center", // center, top, bottom, slideRight
      animation: "fadeIn", // fadeIn, slideUp, slideDown, zoomIn
    },
    defaultStyles: {
      position: "fixed",
      backgroundColor: "#ffffff",
      padding: 32,
      borderRadius: 8,
      maxWidth: "500px",
      width: "90%",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      zIndex: 9999,
    },
    canHaveChildren: true,
    propertySchema: [
      {
        key: "trigger",
        label: "Trigger Type",
        type: "select",
        defaultValue: "exitIntent",
        options: [
          { label: "Exit Intent", value: "exitIntent" },
          { label: "Scroll Depth", value: "scroll" },
          { label: "Time Delay", value: "time" },
          { label: "Button Click", value: "button" },
        ],
      },
      {
        key: "triggerValue",
        label: "Trigger Value",
        type: "text",
        placeholder: "50% for scroll, 5 for seconds, button-id for button",
      },
      {
        key: "overlay",
        label: "Show Overlay",
        type: "checkbox",
        defaultValue: true,
      },
      {
        key: "overlayColor",
        label: "Overlay Color",
        type: "color",
        defaultValue: "rgba(0, 0, 0, 0.7)",
      },
      {
        key: "closeButton",
        label: "Show Close Button",
        type: "checkbox",
        defaultValue: true,
      },
      {
        key: "position",
        label: "Position",
        type: "select",
        defaultValue: "center",
        options: [
          { label: "Center", value: "center" },
          { label: "Top", value: "top" },
          { label: "Bottom", value: "bottom" },
          { label: "Slide from Right", value: "slideRight" },
        ],
      },
    ],
  },

  [FunnelBlockType.COUNTDOWN_TIMER]: {
    type: FunnelBlockType.COUNTDOWN_TIMER,
    category: "Components",
    label: "Countdown Timer",
    defaultProps: {
      endDate: undefined, // ISO date string or undefined
      duration: 600, // seconds from page load (default 10 minutes)
      format: "HH:MM:SS", // HH:MM:SS, MM:SS, days:hours:minutes
      expiredText: "Offer expired!",
      persistent: false, // use localStorage to persist across sessions
      textBefore: "Limited time offer ends in:",
      textAfter: "",
    },
    defaultStyles: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      padding: 24,
      backgroundColor: "#fff3cd",
      borderRadius: 8,
      fontSize: 32,
      fontWeight: 700,
      color: "#856404",
      textAlign: "center",
    },
    canHaveChildren: false,
    propertySchema: [
      {
        key: "duration",
        label: "Duration (seconds)",
        type: "number",
        defaultValue: 600,
        min: 1,
        step: 1,
      },
      {
        key: "format",
        label: "Display Format",
        type: "select",
        defaultValue: "HH:MM:SS",
        options: [
          { label: "HH:MM:SS", value: "HH:MM:SS" },
          { label: "MM:SS", value: "MM:SS" },
          { label: "Days:Hours:Minutes", value: "days:hours:minutes" },
        ],
      },
      {
        key: "textBefore",
        label: "Text Before Timer",
        type: "text",
        defaultValue: "Limited time offer ends in:",
      },
      {
        key: "expiredText",
        label: "Expired Text",
        type: "text",
        defaultValue: "Offer expired!",
      },
      {
        key: "persistent",
        label: "Persist Across Sessions",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },

  [FunnelBlockType.STICKY_BAR]: {
    type: FunnelBlockType.STICKY_BAR,
    category: "Components",
    label: "Sticky Bar",
    defaultProps: {
      position: "bottom", // top or bottom
      showOn: "always", // always, scroll, mobile
      scrollThreshold: 100, // pixels scrolled before showing
      dismissible: true,
    },
    defaultStyles: {
      position: "fixed",
      width: "100%",
      backgroundColor: "#000000",
      color: "#ffffff",
      padding: 16,
      textAlign: "center",
      zIndex: 999,
      boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
    },
    canHaveChildren: true,
    allowedChildren: [
      FunnelBlockType.HEADING,
      FunnelBlockType.PARAGRAPH,
      FunnelBlockType.BUTTON,
    ],
    propertySchema: [
      {
        key: "position",
        label: "Position",
        type: "select",
        defaultValue: "bottom",
        options: [
          { label: "Top", value: "top" },
          { label: "Bottom", value: "bottom" },
        ],
      },
      {
        key: "showOn",
        label: "Show On",
        type: "select",
        defaultValue: "always",
        options: [
          { label: "Always Visible", value: "always" },
          { label: "After Scroll", value: "scroll" },
          { label: "Mobile Only", value: "mobile" },
        ],
      },
      {
        key: "scrollThreshold",
        label: "Scroll Threshold (px)",
        type: "number",
        defaultValue: 100,
        min: 0,
        step: 10,
      },
      {
        key: "dismissible",
        label: "User Can Dismiss",
        type: "checkbox",
        defaultValue: true,
      },
    ],
  },
};

// Helper functions
export function getBlockDefinition(
  type: FunnelBlockType
): BlockDefinition | undefined {
  return BlockRegistry[type];
}

export function getBlocksByCategory(
  category: BlockDefinition["category"]
): BlockDefinition[] {
  return Object.values(BlockRegistry).filter(
    (block) => block.category === category
  );
}

export function getAllCategories(): BlockDefinition["category"][] {
  return [
    "Layouts",
    "Typography",
    "Media",
    "Forms",
    "Components",
    "Embeds",
    "Conversion",
  ];
}

export function canBlockHaveChildren(type: FunnelBlockType): boolean {
  const def = getBlockDefinition(type);
  return def?.canHaveChildren ?? false;
}

export function isChildAllowedInParent(
  childType: FunnelBlockType,
  parentType: FunnelBlockType
): boolean {
  const parentDef = getBlockDefinition(parentType);

  // If parent doesn't allow children at all
  if (!parentDef?.canHaveChildren) {
    return false;
  }

  // If parent has specific allowed children, check if child is in the list
  if (parentDef.allowedChildren && parentDef.allowedChildren.length > 0) {
    return parentDef.allowedChildren.includes(childType);
  }

  // If no restrictions, allow any child
  return true;
}
