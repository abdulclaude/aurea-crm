"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function LaunchpadFirstClassPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { data: rooms } = useQuery(trpc.rooms.list.queryOptions());
  const { data: classTypes } = useQuery(trpc.classTypes.list.queryOptions({}));
  const { data: instructors } = useQuery(
    trpc.instructors.list.queryOptions({}),
  );

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [classTypeId, setClassTypeId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [roomId, setRoomId] = useState("");

  const create = useMutation(
    trpc.studioClassesEnhanced.create.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries();
        toast.success("Class scheduled");
        router.push("/launchpad");
      },
    }),
  );

  const roomList = rooms ?? [];
  const classTypeList = classTypes ?? [];
  const instructorList = instructors?.items ?? [];

  return (
    <div className="flex-1 flex items-center justify-center p-6 mx-auto w-xl">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-1">
          <div>
            <h1 className="text-lg font-semibold text-primary">
              Schedule your first class
            </h1>
            <p className="text-xs text-primary/50">
              Create a class so members can start booking.
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              name,
              startTime,
              endTime,
              classTypeId: classTypeId || undefined,
              instructorId: instructorId || undefined,
              roomId: roomId || undefined,
            });
          }}
        >
          <div className="flex flex-col gap-3">
            <Label>Class name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Yoga"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              <Label>Start time</Label>
              <DateTimePicker
                value={startTime}
                onChange={setStartTime}
                dateAriaLabel="Class start date"
                timeAriaLabel="Class start time"
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label>End time</Label>
              <DateTimePicker
                value={endTime}
                onChange={setEndTime}
                minDate={startTime ? new Date(startTime) : undefined}
                dateAriaLabel="Class end date"
                timeAriaLabel="Class end time"
                required
              />
            </div>
          </div>
          {classTypeList.length > 0 && (
            <div className="flex flex-col gap-3">
              <Label>Class type (optional)</Label>
              <Select value={classTypeId} onValueChange={setClassTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent>
                  {classTypeList.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {instructorList.length > 0 && (
            <div className="flex flex-col gap-3">
              <Label>Instructor (optional)</Label>
              <Select value={instructorId} onValueChange={setInstructorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructorList.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {roomList.length > 0 && (
            <div className="flex flex-col gap-3">
              <Label>Room (optional)</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {roomList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-3 justify-end mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/launchpad")}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                create.isPending || !name.trim() || !startTime || !endTime
              }
            >
              {create.isPending ? "Scheduling..." : "Schedule class"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
