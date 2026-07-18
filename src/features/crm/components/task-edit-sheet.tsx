"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskStatus, TaskPriority } from "@/db/enums";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  dueDate: z.string().optional(),
  clientId: z.string().optional(),
  dealId: z.string().optional(),
  assigneeId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PRIORITY_CONFIG = {
  [TaskPriority.LOW]: { label: "Low", color: "bg-slate-500" },
  [TaskPriority.MEDIUM]: { label: "Medium", color: "bg-blue-500" },
  [TaskPriority.HIGH]: { label: "High", color: "bg-amber-500" },
  [TaskPriority.URGENT]: { label: "Urgent", color: "bg-red-500" },
};

const STATUS_CONFIG = {
  [TaskStatus.TODO]: { label: "To Do", color: "bg-slate-500" },
  [TaskStatus.IN_PROGRESS]: { label: "In Progress", color: "bg-blue-500" },
  [TaskStatus.DONE]: { label: "Done", color: "bg-emerald-500" },
  [TaskStatus.CANCELLED]: { label: "Cancelled", color: "bg-red-500" },
};

interface TaskEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date | null;
    clientId?: string | null;
    dealId?: string | null;
    assigneeId?: string | null;
  } | null;
  defaultClientId?: string;
  defaultDealId?: string;
}

export function TaskEditSheet({
  open,
  onOpenChange,
  task,
  defaultClientId,
  defaultDealId,
}: TaskEditSheetProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEditing = !!task;

  const { data: assignees = [] } = useQuery(
    trpc.tasks.getAssignees.queryOptions(),
  );
  const { data: clientsData } = useQuery(trpc.clients.list.queryOptions());
  const { data: dealsData } = useQuery(trpc.deals.list.queryOptions({}));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? TaskStatus.TODO,
      priority: task?.priority ?? TaskPriority.MEDIUM,
      dueDate: task?.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      clientId: task?.clientId ?? defaultClientId ?? "",
      dealId: task?.dealId ?? defaultDealId ?? "",
      assigneeId: task?.assigneeId ?? "",
    },
  });

  // Reset form when task changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? TaskStatus.TODO,
        priority: task?.priority ?? TaskPriority.MEDIUM,
        dueDate: task?.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        clientId: task?.clientId ?? defaultClientId ?? "",
        dealId: task?.dealId ?? defaultDealId ?? "",
        assigneeId: task?.assigneeId ?? "",
      });
    }
  }, [open, task, defaultClientId, defaultDealId, form]);

  const createTask = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        onOpenChange(false);
      },
    }),
  );

  const updateTask = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        onOpenChange(false);
      },
    }),
  );

  const onSubmit = async (values: FormValues) => {
    const data = {
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate ? new Date(values.dueDate) : null,
      clientId: values.clientId || null,
      dealId: values.dealId || null,
      assigneeId: values.assigneeId || null,
    };

    if (isEditing && task) {
      await updateTask.mutateAsync({ id: task.id, ...data });
    } else {
      await createTask.mutateAsync(data);
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 bg-[#1a2326] border-white/5 sm:max-w-xl">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{isEditing ? "Edit task" : "Create task"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the task details below."
              : "Fill in the task details below."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Task title
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Follow up with client" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional details..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Status
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(
                            ([value, config]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "size-2 rounded-full",
                                      config.color,
                                    )}
                                  />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Priority
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(
                            ([value, config]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "size-2 rounded-full",
                                      config.color,
                                    )}
                                  />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Due date
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        date={parseDateValue(field.value)}
                        onSelect={(date) =>
                          field.onChange(formatDateValue(date))
                        }
                        placeholder="Pick a due date"
                        ariaLabel="Due date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Assignee
                    </FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? "" : v)
                      }
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {assignees.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-5">
                                {member.image ? (
                                  <AvatarImage
                                    src={member.image}
                                    alt={member.name ?? ""}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-[#202e32] text-white text-[10px]">
                                    {(member.name?.[0] ?? "U").toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              {member.name ?? member.email}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!defaultClientId && (
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Related client
                      </FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {clientsData?.items.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                              {client.companyName && ` - ${client.companyName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!defaultDealId && (
                <FormField
                  control={form.control}
                  name="dealId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Related deal
                      </FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select deal..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {dealsData?.items.map((deal) => (
                            <SelectItem key={deal.id} value={deal.id}>
                              {deal.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </div>

        <SheetFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            {isEditing ? "Save changes" : "Create task"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
