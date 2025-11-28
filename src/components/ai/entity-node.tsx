import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";

const EntityNodeView = ({ node }: { node: any }) => {
  const { type, name } = node.attrs;

  const typeColors: Record<string, string> = {
    contact: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    deal: "bg-green-500/20 text-green-400 border-green-500/30",
    pipeline: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    workflow: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  const typeIcons: Record<string, string> = {
    contact: "@",
    deal: "$",
    pipeline: "→",
    workflow: "⚡",
  };

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${typeColors[type] || "bg-gray-500/20 text-gray-400"}`}
      >
        <span>{typeIcons[type] || "#"}</span>
        <span>{name}</span>
      </span>
    </NodeViewWrapper>
  );
};

export const EntityNode = Node.create({
  name: "entityReference",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      type: {
        default: null,
      },
      name: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-entity-reference]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-entity-reference": "" }),
      HTMLAttributes.name,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EntityNodeView);
  },
});
