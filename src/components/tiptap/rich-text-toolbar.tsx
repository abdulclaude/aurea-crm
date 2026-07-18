"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RichTextToolbarButton } from "./rich-text-toolbar-button";

type RichTextToolbarProps = {
  editor: Editor;
};

export function RichTextToolbar({ editor }: RichTextToolbarProps) {
  useEditorRenderTrigger(editor);

  const setLink = React.useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", typeof previousUrl === "string" ? previousUrl : "");

    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 border-b border-black/5 bg-primary-foreground/20 p-1 dark:border-white/5">
        <RichTextToolbarButton
          label="Bold"
          icon={Bold}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <RichTextToolbarButton
          label="Italic"
          icon={Italic}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <RichTextToolbarButton
          label="Strikethrough"
          icon={Strikethrough}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <RichTextToolbarButton
          label="Underline"
          icon={Underline}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <RichTextToolbarButton
          label="Inline code"
          icon={Code}
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <RichTextToolbarButton
          label="Heading 1"
          icon={Heading1}
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <RichTextToolbarButton
          label="Heading 2"
          icon={Heading2}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <RichTextToolbarButton
          label="Heading 3"
          icon={Heading3}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <RichTextToolbarButton
          label="Bullet list"
          icon={List}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <RichTextToolbarButton
          label="Numbered list"
          icon={ListOrdered}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <RichTextToolbarButton
          label="Checklist"
          icon={ListChecks}
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        />
        <RichTextToolbarButton
          label="Quote"
          icon={Quote}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <RichTextToolbarButton
          label="Link"
          icon={Link}
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <RichTextToolbarButton
          label="Code block"
          icon={Code2}
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <RichTextToolbarButton
          label="Horizontal rule"
          icon={Minus}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <RichTextToolbarButton
          label="Undo"
          icon={Undo2}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <RichTextToolbarButton
          label="Redo"
          icon={Redo2}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>
    </TooltipProvider>
  );
}

function useEditorRenderTrigger(editor: Editor): void {
  const [, setVersion] = React.useState(0);

  React.useEffect(() => {
    const bump = () => setVersion((version) => version + 1);

    editor.on("transaction", bump);
    editor.on("selectionUpdate", bump);

    return () => {
      editor.off("transaction", bump);
      editor.off("selectionUpdate", bump);
    };
  }, [editor]);
}
