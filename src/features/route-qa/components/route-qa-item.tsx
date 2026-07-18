"use client";

import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ExternalLink, MessageSquareText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTE_QA_NOTE_MAX_LENGTH } from "@/features/route-qa/lib/route-qa-storage";
import type { RouteQaItem as RouteQaItemType } from "@/features/route-qa/types";
import { cn } from "@/lib/utils";

type RouteQaItemProps = {
  item: RouteQaItemType;
  completed: boolean;
  note: string;
  onToggle: (id: string) => void;
  onNoteChange: (id: string, value: string) => void;
};

export const RouteQaItem = memo(function RouteQaItem({
  item,
  completed,
  note,
  onToggle,
  onNoteChange,
}: RouteQaItemProps): React.ReactElement {
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(note);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedNoteRef = useRef(note);
  const noteEditorId = useId();
  const canOpen = !item.route.includes("[") && !item.route.startsWith("/api/");
  const hasNote = note.trim().length > 0;

  useEffect(() => {
    lastSavedNoteRef.current = note;
    if (!noteOpen) setDraftNote(note);
  }, [note, noteOpen]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  const saveNote = useCallback(
    (value: string): void => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (value === lastSavedNoteRef.current) return;
      lastSavedNoteRef.current = value;
      onNoteChange(item.id, value);
    },
    [item.id, onNoteChange],
  );

  const updateDraftNote = useCallback(
    (value: string): void => {
      setDraftNote(value);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => saveNote(value), 500);
    },
    [saveNote],
  );

  const closeNote = useCallback((): void => {
    saveNote(draftNote);
    setNoteOpen(false);
  }, [draftNote, saveNote]);

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 border-t border-black/5 px-6 py-4 transition-colors dark:border-white/5",
        completed && "bg-emerald-500/5",
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={() => onToggle(item.id)}
        aria-label={`Mark ${item.route} ${completed ? "incomplete" : "complete"}`}
        className="mt-0.5"
      />

      <div className="min-w-0 space-y-2">
        <code
          className={cn(
            "block break-all text-xs font-medium text-primary",
            completed && "text-primary/50 line-through",
          )}
        >
          {item.route}
        </code>
        {item.test && (
          <p className="text-xs leading-5 text-primary/70">{item.test}</p>
        )}
        {item.expected && (
          <p className="text-xs leading-5 text-primary/50">
            <span className="font-medium text-primary/65">Expected: </span>
            {item.expected}
          </p>
        )}

        {noteOpen ? (
          <div
            id={noteEditorId}
            className="space-y-2 border-l-2 border-emerald-600/60 pl-3"
          >
            <Label htmlFor={`${noteEditorId}-input`} className="sr-only">
              Note for {item.route}
            </Label>
            <Textarea
              id={`${noteEditorId}-input`}
              value={draftNote}
              maxLength={ROUTE_QA_NOTE_MAX_LENGTH}
              autoFocus
              onChange={(event) => updateDraftNote(event.target.value)}
              onBlur={() => saveNote(draftNote)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeNote();
              }}
              placeholder="Add a note about this route"
              className="min-h-24 resize-y"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] tabular-nums text-primary/45">
                {draftNote.length}/{ROUTE_QA_NOTE_MAX_LENGTH}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={closeNote}
                aria-label={`Close note for ${item.route}`}
              >
                <X />
              </Button>
            </div>
          </div>
        ) : (
          hasNote && (
            <div className="border-l-2 border-emerald-600/60 bg-primary-foreground/20 px-3 py-2">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-primary/65">
                <MessageSquareText className="size-3" />
                Note
              </div>
              <p className="whitespace-pre-wrap break-words text-xs leading-5 text-primary/70">
                {note}
              </p>
            </div>
          )
        )}
      </div>

      <div className="flex items-start gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={hasNote ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => {
                if (noteOpen) closeNote();
                else {
                  setDraftNote(note);
                  setNoteOpen(true);
                }
              }}
              aria-label={`${hasNote ? "Edit" : "Add"} note for ${item.route}`}
              aria-expanded={noteOpen}
              aria-controls={noteOpen ? noteEditorId : undefined}
            >
              <MessageSquareText />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hasNote ? "Edit note" : "Add note"}</TooltipContent>
        </Tooltip>

        {canOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link
                  href={item.route}
                  target="_blank"
                  aria-label={`Open ${item.route} in a new tab`}
                >
                  <ExternalLink />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open route</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
