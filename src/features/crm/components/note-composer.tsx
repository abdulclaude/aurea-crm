"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SuggestionItem } from "@/components/ai/types";
import { createChatSuggestion } from "@/components/ai/chat-suggestion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MentionableMember = {
  userId: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
};

interface NoteComposerProps {
  members: MentionableMember[];
  onSubmit: (content: string, mentionIds: string[]) => void;
  isSubmitting?: boolean;
  placeholder?: string;
  className?: string;
}

export const NoteComposer = ({
  members,
  onSubmit,
  isSubmitting = false,
  placeholder = "Add a note... (use @ to mention teammates)",
  className,
}: NoteComposerProps) => {
  const suggestionItems = useMemo<SuggestionItem[]>(() => {
    return members
      .filter((member) => member.userId)
      .map((member) => ({
        id: member.userId as string,
        name: member.name || member.email || "Unknown member",
        type: "member",
        description: member.email || undefined,
      }));
  }, [members]);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      const lower = query.toLowerCase();
      if (!lower) return suggestionItems;
      return suggestionItems.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(lower);
        const descriptionMatch = item.description
          ? item.description.toLowerCase().includes(lower)
          : false;
        return nameMatch || descriptionMatch;
      });
    },
    [suggestionItems]
  );

  const fetchSuggestionsRef = useRef(fetchSuggestions);

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
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          char: "@",
          ...createChatSuggestion((query) => fetchSuggestionsRef.current(query)),
        },
        renderText: ({ node }) => `@${node.attrs.label}`,
        renderHTML: ({ node }) => [
          "span",
          {
            class:
              "mention px-1 py-0.5 rounded text-[11px] font-medium bg-black/90 text-white",
            "data-type": "member",
          },
          `@${node.attrs.label}`,
        ],
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "outline-none min-h-[96px] max-h-[240px] overflow-y-auto text-xs text-primary dark:text-white/90",
      },
    },
    editable: !isSubmitting,
  });

  const extractMentionIds = useCallback(() => {
    if (!editor) return [];
    const ids = new Set<string>();
    const json = editor.getJSON();
    const traverse = (node: any) => {
      if (node.type === "mention" && node.attrs?.id) {
        ids.add(node.attrs.id);
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };
    traverse(json);
    return Array.from(ids);
  }, [editor]);

  const handleSubmit = useCallback(() => {
    if (!editor) return;
    const content = editor.getText().trim();
    if (!content) return;
    const mentionIds = extractMentionIds();
    onSubmit(content, mentionIds);
    editor.commands.clearContent();
  }, [editor, extractMentionIds, onSubmit]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-black/10 dark:border-white/5 bg-background/80 p-3",
        className
      )}
    >
      <EditorContent editor={editor} />
      <div className="mt-2 flex items-center justify-between text-[10px] text-primary/60 dark:text-white/40">
        <span>Shift+Enter for a new line</span>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="text-[11px] rounded-sm"
        >
          Add note
        </Button>
      </div>
    </div>
  );
};
