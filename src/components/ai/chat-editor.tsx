"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { EntityNode } from "./entity-node";
import { createChatSuggestion } from "./chat-suggestion";
import type { EntityReference, SuggestionItem } from "./types";
import { cn } from "@/lib/utils";

interface ChatEditorProps {
  placeholder?: string;
  onSubmit?: (
    content: string,
    html: string,
    entities: EntityReference[]
  ) => void;
  disabled?: boolean;
  className?: string;
  fetchSuggestions: (
    query: string,
    type: "mention" | "command"
  ) => Promise<SuggestionItem[]>;
  bottomBar?: React.ReactNode;
}

export interface ChatEditorHandle {
  clear: () => void;
  focus: () => void;
}

export const ChatEditor = forwardRef<ChatEditorHandle, ChatEditorProps>(
  (
    {
      placeholder = "Type a message...",
      onSubmit,
      disabled,
      className,
      fetchSuggestions,
      bottomBar,
    },
    ref
  ) => {
    const suggestionActiveRef = useRef(false);
    const fetchSuggestionsRef = useRef(fetchSuggestions);

    // Keep the ref updated with the latest fetchSuggestions function
    useEffect(() => {
      fetchSuggestionsRef.current = fetchSuggestions;
    }, [fetchSuggestions]);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder,
        }),
        EntityNode,
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            char: "@",
            ...createChatSuggestion(
              (query) => fetchSuggestionsRef.current(query, "mention"),
              suggestionActiveRef
            ),
          },
          renderText: ({ node }) => `@${node.attrs.label}`,
          renderHTML: ({ node }) => {
            const entityType = node.attrs.type || "contact";
            const colorClasses: Record<string, string> = {
              contact:
                "bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs!",
              deal: "bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs!",
              pipeline:
                "bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs!",
              workflow:
                "bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs!",
            };
            const colorClass = colorClasses[entityType] || colorClasses.contact;
            return [
              "span",
              {
                class: `mention px-1.5 py-0.5 rounded text-sm font-medium ${colorClass}`,
                "data-type": entityType,
              },
              `@${node.attrs.label}`,
            ];
          },
        }),
        Mention.extend({ name: "slashCommand" }).configure({
          HTMLAttributes: {
            class: "slash-command",
          },
          suggestion: {
            char: "/",
            ...createChatSuggestion(
              (query) => fetchSuggestionsRef.current(query, "command"),
              suggestionActiveRef
            ),
          },
          renderText: ({ node }) => `/${node.attrs.label}`,
          renderHTML: ({ node }) => {
            const commandType = node.attrs.type || "action";
            const colorClasses: Record<string, string> = {
              action:
                "bg-green-500/20 text-green-700 dark:text-green-300 text-xs!",
              ai: "bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs!",
              query: "bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs!",
            };
            const colorClass = colorClasses[commandType] || colorClasses.action;
            return [
              "span",
              {
                class: `slash-command px-1.5 py-0.5 rounded text-sm font-medium ${colorClass}`,
                "data-type": commandType,
              },
              `/${node.attrs.label}`,
            ];
          },
        }),
      ],
      editorProps: {
        attributes: {
          class: "outline-none min-h-[120px] max-h-[300px] overflow-y-auto",
        },
        handleKeyDown: (view, event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !suggestionActiveRef.current
          ) {
            event.preventDefault();
            handleSubmit();
            return true;
          }
          return false;
        },
      },
      editable: !disabled,
    });

    const extractEntities = useCallback((): EntityReference[] => {
      if (!editor) return [];

      const entities: EntityReference[] = [];
      const json = editor.getJSON();

      const traverse = (node: any) => {
        if (node.type === "mention" || node.type === "slashCommand") {
          entities.push({
            type: node.attrs.type || "contact",
            id: node.attrs.id,
            name: node.attrs.label,
          });
        }
        if (node.type === "entityReference") {
          entities.push({
            type: node.attrs.type,
            id: node.attrs.id,
            name: node.attrs.name,
          });
        }
        if (node.content) {
          node.content.forEach(traverse);
        }
      };

      traverse(json);
      return entities;
    }, [editor]);

    const handleSubmit = useCallback(() => {
      if (!editor || disabled) return;

      const content = editor.getText().trim();
      const html = editor.getHTML();

      if (!content) return;

      const entities = extractEntities();
      onSubmit?.(content, html, entities);
    }, [editor, disabled, extractEntities, onSubmit]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        editor?.commands.clearContent();
      },
      focus: () => {
        editor?.commands.focus();
      },
    }));

    if (!editor) {
      return null;
    }

    return (
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "rounded-sm border border-black/10 bg-background text-xs text-primary",
            " shadow-none!",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <EditorContent editor={editor} className="px-5 py-2 pt-4" />
          {bottomBar && <div className="px-2 pb-2">{bottomBar}</div>}
        </div>
      </div>
    );
  }
);

ChatEditor.displayName = "ChatEditor";
