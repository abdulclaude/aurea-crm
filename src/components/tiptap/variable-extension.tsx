import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

interface VariableAttributes {
  path: string;
  label: string;
}

// React component for rendering the variable chip
const VariableComponent = (props: any) => {
  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex items-center px-2 py-1 rounded-sm bg-[#202e32] brightness-130 text-white text-[11px] border border-white/5"
      contentEditable={false}
    >
      <span>{props.node.attrs.label}</span>
    </NodeViewWrapper>
  );
};

export const VariableExtension = Node.create({
  name: "variable",

  group: "inline",

  inline: true,

  atom: true,

  addAttributes() {
    return {
      path: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-path"),
        renderHTML: (attributes) => {
          return {
            "data-path": attributes.path,
          };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => {
          return {
            "data-label": attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "variable" }),
      `@${HTMLAttributes["data-label"]}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableComponent);
  },
});
