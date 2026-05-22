"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Pin, PinOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { NoteComposer, type MentionableMember } from "./note-composer";

interface NotesPanelProps {
  clientId?: string;
  dealId?: string;
  members: MentionableMember[];
  className?: string;
}

export const NotesPanel = ({
  clientId,
  dealId,
  members,
  className,
}: NotesPanelProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listInput = clientId ? { clientId } : { dealId: dealId as string };

  const { data: notes = [], isLoading } = useQuery(
    trpc.notes.list.queryOptions(listInput)
  );

  const createNote = useMutation(
    trpc.notes.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.notes.list.queryKey(listInput),
        });
      },
    })
  );

  const pinNote = useMutation(
    trpc.notes.pin.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.notes.list.queryKey(listInput),
        });
      },
    })
  );

  const handleCreateNote = async (content: string, mentionIds: string[]) => {
    await createNote.mutateAsync({
      ...listInput,
      content,
      mentionIds,
    });
  };

  const handleTogglePin = async (noteId: string, pinned: boolean) => {
    await pinNote.mutateAsync({ id: noteId, pinned });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <NoteComposer
        members={members}
        onSubmit={handleCreateNote}
        isSubmitting={createNote.isPending}
      />

      <div className="space-y-3">
        {isLoading && (
          <p className="text-xs text-primary/50 dark:text-white/40">
            Loading notes...
          </p>
        )}

        {!isLoading && notes.length === 0 && (
          <p className="text-xs text-primary/50 dark:text-white/40">
            No notes yet. Add the first update above.
          </p>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className={cn(
              "rounded-md border border-black/10 dark:border-white/5 bg-background/70 p-3 space-y-2",
              note.pinned && "border-amber-400/40 bg-amber-400/5"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  {note.author?.image ? (
                    <AvatarImage
                      src={note.author.image}
                      alt={note.author.name ?? "User"}
                    />
                  ) : (
                    <AvatarFallback className="bg-[#202e32] text-white text-[10px]">
                      {(note.author?.name?.[0] ?? "U").toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-xs text-primary dark:text-white">
                    {note.author?.name ?? "Unknown author"}
                  </p>
                  <p className="text-[10px] text-primary/50 dark:text-white/40">
                    {formatDistanceToNow(new Date(note.createdAt), {
                      addSuffix: true,
                    })}
                    {note.pinned ? " · Pinned" : ""}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleTogglePin(note.id, !note.pinned)}
                className="size-7 text-primary/60 hover:text-primary dark:text-white/60 dark:hover:text-white"
                disabled={pinNote.isPending}
              >
                {note.pinned ? (
                  <PinOff className="size-3.5" />
                ) : (
                  <Pin className="size-3.5" />
                )}
              </Button>
            </div>

            <p className="text-xs text-primary/80 dark:text-white/80 whitespace-pre-wrap">
              {note.content}
            </p>

            {note.mentions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-[10px] text-primary/60 dark:text-white/50">
                <span>Mentioned:</span>
                {note.mentions.map((mention) => (
                  <span
                    key={mention.userId}
                    className="rounded-sm bg-black/80 px-1.5 py-0.5 text-white/90"
                  >
                    @{mention.user.name ?? mention.user.email ?? "member"}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
