"use client";

import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DIFFICULTIES = [
  { value: "ALL_LEVELS", label: "All Levels" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

type Difficulty = (typeof DIFFICULTIES)[number]["value"];

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStart?: Date;
  defaultEnd?: Date;
  /** When set, locks the instructor to this ID and filters the class picker to only their classes. */
  forInstructorId?: string;
}

export function CreateClassDialog({
  open,
  onOpenChange,
  defaultStart,
  defaultEnd,
  forInstructorId,
}: CreateClassDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: allClassesData } = useQuery({
    ...trpc.studioClasses.list.queryOptions({ page: 1, pageSize: 100 }),
    enabled: !forInstructorId,
  });
  const { data: myClassesData } = useQuery({
    ...trpc.instructors.getMyClasses.queryOptions({ status: "upcoming" }),
    enabled: !!forInstructorId,
  });
  const { data: classTypes } = useQuery(trpc.classTypes.list.queryOptions({}));
  const { data: rooms } = useQuery(trpc.rooms.list.queryOptions());
  const { data: instructorsData } = useQuery({
    ...trpc.instructors.list.queryOptions({}),
    enabled: !forInstructorId,
  });
  const instructors = instructorsData?.items;
  const classes = forInstructorId ? myClassesData : allClassesData?.classes;

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classTypeId, setClassTypeId] = useState<string>("");
  const [instructorId, setInstructorId] = useState<string>(
    forInstructorId ?? "",
  );
  const [roomId, setRoomId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("ALL_LEVELS");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    if (open) {
      if (defaultStart) {
        setDate(formatDateForInput(defaultStart));
        setStartTime(formatTimeForInput(defaultStart));
      }
      if (defaultEnd) {
        setEndTime(formatTimeForInput(defaultEnd));
      }
    }
  }, [open, defaultStart, defaultEnd]);

  function handleClassSelect(classId: string) {
    setSelectedClassId(classId);
    if (!classId) return;
    const cls = classes?.find((c) => c.id === classId);
    if (!cls) return;
    setName(cls.name);
    setDescription(cls.description ?? "");
    setClassTypeId((cls as any).classTypeId ?? "");
    setMaxCapacity(cls.maxCapacity?.toString() ?? "");
    setDifficulty(((cls as any).difficulty as Difficulty) ?? "ALL_LEVELS");
    setRoomId((cls as any).roomId ?? "");
  }

  const createMutation = useMutation(
    trpc.studioClassesEnhanced.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getSchedule.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.stats.queryKey(),
        });
        if (forInstructorId) {
          queryClient.invalidateQueries({
            queryKey: trpc.instructors.getMyClasses.queryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.instructors.getMySchedule.queryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.instructors.listMyClasses.queryKey(),
          });
        }
        onOpenChange(false);
        resetForm();
        toast.success("Class scheduled");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function resetForm() {
    setSelectedClassId("");
    setName("");
    setDescription("");
    setClassTypeId("");
    setInstructorId(forInstructorId ?? "");
    setRoomId("");
    setDifficulty("ALL_LEVELS");
    setMaxCapacity("");
    setDate(formatDateForInput(new Date()));
    setStartTime("09:00");
    setEndTime("10:00");
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Class name is required");
      return;
    }
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    createMutation.mutate({
      name,
      description: description || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      classTypeId: classTypeId || undefined,
      instructorId: instructorId || undefined,
      roomId: roomId || undefined,
      difficulty,
      isVirtual: false,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule a class</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Class picker */}
          <div className="space-y-3">
            <Label>Class</Label>
            <Select value={selectedClassId} onValueChange={handleClassSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Pick an existing class to schedule…" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                    {(cls as any).classType?.name
                      ? ` · ${(cls as any).classType.name}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-primary/50">
              Selecting a class pre-fills the details below. You can still edit
              them.
            </p>
          </div>

          {/* Instructor picker — hidden when scheduling as an instructor */}
          {!forInstructorId && (
            <div className="space-y-3">
              <Label>Instructor</Label>
              <Select value={instructorId} onValueChange={setInstructorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator className="bg-black/5 dark:bg-white/5" />

          {/* Date + time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-3">
              <Label>Date</Label>
              <DatePicker
                date={parseDateValue(date)}
                onSelect={(nextDate) => setDate(formatDateValue(nextDate))}
                placeholder="Pick a date"
                ariaLabel="Class date"
              />
            </div>
            <div className="space-y-3">
              <Label>Start</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <Label>End</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <Separator className="bg-black/5 dark:bg-white/5" />

          {/* Details (pre-filled from class selection, editable) */}
          <div className="space-y-3">
            <Label>Class name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Vinyasa"
            />
          </div>

          <div className="space-y-3">
            <Label>
              Description{" "}
              <span className="text-primary/40 font-normal">(optional)</span>
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <Label>Class type</Label>
              <Select value={classTypeId} onValueChange={setClassTypeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>

                <SelectContent>
                  {classTypes?.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.capacity ? ` (${r.capacity})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Max capacity</Label>
              <Input
                type="number"
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="ghost"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSubmit}
            disabled={!name.trim() || !date || createMutation.isPending}
          >
            {createMutation.isPending ? "Scheduling…" : "Schedule class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTimeForInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
