"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import * as React from "react";
import { cn } from "@/lib/utils";
import { RichTextToolbar } from "./rich-text-toolbar";

type RichTextEditorProps = {
  className?: string;
  disabled?: boolean;
  minHeightClassName?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

const EMPTY_DOCUMENT_HTML = "<p></p>";

export function RichTextEditor({
  className,
  disabled,
  minHeightClassName = "min-h-[140px]",
  onChange,
  placeholder = "Write content...",
  value,
}: RichTextEditorProps) {
  const onChangeRef = React.useRef(onChange);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || EMPTY_DOCUMENT_HTML,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "max-w-none px-3 py-3 text-xs text-primary",
          "prose prose-sm dark:prose-invert",
          "prose-headings:font-semibold prose-headings:text-primary",
          "prose-p:my-1.5 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-2",
          "prose-pre:rounded-sm prose-pre:bg-black/80 prose-pre:p-3",
          "focus:outline-none",
          minHeightClassName,
        ),
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChangeRef.current(updatedEditor.isEmpty ? "" : updatedEditor.getHTML());
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  React.useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.isEmpty ? "" : editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || EMPTY_DOCUMENT_HTML, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-sm border border-black/10 bg-background shadow-sm dark:border-white/5",
        "focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/15",
        disabled && "opacity-60",
        className,
      )}
    >
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
