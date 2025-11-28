"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Mention } from "@tiptap/extension-mention";
import { useEffect, useRef } from "react";
import { VariableExtension } from "./variable-extension";
import { variableSuggestion, type VariableItem } from "./variable-suggestion";
import { cn } from "@/lib/utils";

interface VariableInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  variables: VariableItem[];
  className?: string;
  onExtractHandlebars?: (text: string) => string;
  disabled?: boolean;
}

export const VariableInput = ({
  value = "",
  onChange,
  placeholder,
  variables,
  className,
  disabled,
}: VariableInputProps) => {
  // Use a ref to maintain the latest onChange callback
  const onChangeRef = useRef(onChange);
  // Use a ref to maintain the latest variables array
  const variablesRef = useRef(variables);

  // Update the ref whenever onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Update the ref whenever variables change
  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          code: false,
          hardBreak: false,
        }),
        VariableExtension,
        Mention.extend({
          name: "variableMention",
        }).configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            ...variableSuggestion(variables),
            char: "@",
            command: ({ editor, range, props }: any) => {
              // Delete the trigger character and insert a variable node
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({
                  type: "variable",
                  attrs: {
                    path: props.path,
                    label: props.label,
                  },
                })
                .run();
            },
          },
          renderText({ node }) {
            return `@${node.attrs.label}`;
          },
        }),
        Mention.extend({
          name: "slashMention",
        }).configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            ...variableSuggestion(variables),
            char: "/",
            command: ({ editor, range, props }: any) => {
              // Delete the trigger character and insert a variable node
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({
                  type: "variable",
                  attrs: {
                    path: props.path,
                    label: props.label,
                  },
                })
                .run();
            },
          },
          renderText({ node }) {
            return `/${node.attrs.label}`;
          },
        }),
      ],
      content: "",
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm focus:outline-none min-h-[80px] max-w-none p-3",
            className
          ),
        },
      },
      onUpdate: ({ editor }) => {
        // Extract the content and convert variable nodes to Handlebars
        const json = editor.getJSON();
        const handlebarsText = convertToHandlebars(json);
        // Use the ref to always call the latest onChange callback
        onChangeRef.current?.(handlebarsText);
      },
    },
    [] // Empty deps - editor should be created once and persisted
  );

  // Update editor editable state when disabled prop changes
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  // Update suggestion items when variables change
  useEffect(() => {
    if (!editor) return;

    // Update the mention extensions with new variables
    const variableMention = editor.extensionManager.extensions.find(
      (ext) => ext.name === "variableMention"
    );
    const slashMention = editor.extensionManager.extensions.find(
      (ext) => ext.name === "slashMention"
    );

    if (variableMention) {
      variableMention.options.suggestion = {
        ...variableMention.options.suggestion,
        ...variableSuggestion(variables),
      };
    }

    if (slashMention) {
      slashMention.options.suggestion = {
        ...slashMention.options.suggestion,
        ...variableSuggestion(variables),
      };
    }
  }, [variables, editor]);

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (!editor) return;

    const currentHandlebars = convertToHandlebars(editor.getJSON());

    // Always update if value is different (including on initial mount)
    if (value !== currentHandlebars) {
      // Convert Handlebars back to editor content using ref
      const content = convertFromHandlebars(value, variablesRef.current);

      // Use setContent without emitting onChange
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [value, editor]); // Removed variables from deps to prevent reset on variable changes

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative",
        "before:pointer-events-none focus-within:before:opacity-100 before:opacity-0 before:absolute before:-inset-0.5 before:rounded-[12px] before:border before:border-sky-500 before:ring-2 before:ring-blue-500/20 before:transition",
        "after:pointer-events-none after:absolute after:inset-px after:rounded-lg after:shadow-highlight after:shadow-white/5 focus-within:after:shadow-sky-500 dark:focus-within:after:shadow-blue-500/20 after:transition w-full"
      )}
    >
      <div
        className={cn(
          "relative text-xs text-primary dark:text-neutral-200 bg-white dark:bg-neutral-750 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg outline-none transition duration-150 hover:bg-primary-foreground/15 w-full ring ring-black/10 shadow-sm",
          className
        )}
      >
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  );
};

// Helper function to convert editor JSON to Handlebars string
function convertToHandlebars(json: any): string {
  if (!json || !json.content) return "";

  let result = "";

  for (const node of json.content) {
    if (node.type === "paragraph") {
      if (node.content) {
        for (const child of node.content) {
          if (child.type === "text") {
            result += child.text;
          } else if (
            child.type === "variable" ||
            child.type === "variableMention" ||
            child.type === "slashMention"
          ) {
            result += `{{${child.attrs.path || child.attrs.id}}}`;
          }
        }
      }
      result += "\n";
    }
  }

  return result.trim();
}

// Helper function to convert Handlebars string back to editor JSON
function convertFromHandlebars(text: string, variables: VariableItem[]): any {
  if (!text) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    };
  }

  // Parse Handlebars {{path}} and convert to variable nodes
  const content: any[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const paragraphContent: any[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;

    // biome-ignore lint/suspicious/noAssignInExpressions: regex matching pattern
    while ((match = regex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        paragraphContent.push({
          type: "text",
          text: line.substring(lastIndex, match.index),
        });
      }

      // Find the variable by path
      const path = match[1];
      const variable = findVariableByPath(path, variables);

      if (variable) {
        paragraphContent.push({
          type: "variable",
          attrs: {
            path: variable.path,
            label: variable.label,
          },
        });
      } else {
        // If variable not found, create a temporary one with the path
        // Extract the last part as the label
        const parts = path.split(".");
        const label = parts[parts.length - 1];

        paragraphContent.push({
          type: "variable",
          attrs: {
            path: path,
            label: label,
          },
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      paragraphContent.push({
        type: "text",
        text: line.substring(lastIndex),
      });
    }

    content.push({
      type: "paragraph",
      content: paragraphContent.length > 0 ? paragraphContent : undefined,
    });
  }

  return {
    type: "doc",
    content,
  };
}

// Helper to recursively find a variable by path
function findVariableByPath(
  path: string,
  variables: VariableItem[]
): VariableItem | null {
  for (const variable of variables) {
    if (variable.path === path) {
      return variable;
    }
    if (variable.children) {
      const found = findVariableByPath(path, variable.children);
      if (found) return found;
    }
  }
  return null;
}

// Utility function to extract Handlebars from plain text
export function extractHandlebars(text: string): string {
  return text;
}
