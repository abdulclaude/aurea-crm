"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores.",
    }),
  labelId: z
    .string()
    .min(1, { message: "Label or mailbox is required (try INBOX)." }),
  query: z.string().optional(),
  includeSpamTrash: z.boolean().default(false),
  maxResults: z.coerce
    .number({
      invalid_type_error: "Max results must be a number.",
    })
    .min(1)
    .max(50)
    .default(5),
  pollIntervalMinutes: z.coerce
    .number({
      invalid_type_error: "Poll interval must be a number.",
    })
    .min(1)
    .max(60)
    .default(5),
});

export type GmailTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GmailTriggerFormValues) => void;
  defaultValues?: Partial<GmailTriggerFormValues>;
}

export const GmailTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}) => {
  const form = useForm<GmailTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "gmailTrigger",
      labelId: defaultValues?.labelId || "INBOX",
      query: defaultValues?.query || "",
      includeSpamTrash: defaultValues?.includeSpamTrash ?? false,
      maxResults: defaultValues?.maxResults ?? 5,
      pollIntervalMinutes: defaultValues?.pollIntervalMinutes ?? 5,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues?.variableName || "gmailTrigger",
        labelId: defaultValues?.labelId || "INBOX",
        query: defaultValues?.query || "",
        includeSpamTrash: defaultValues?.includeSpamTrash ?? false,
        maxResults: defaultValues?.maxResults ?? 5,
        pollIntervalMinutes: defaultValues?.pollIntervalMinutes ?? 5,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: GmailTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle>Gmail trigger</DialogTitle>
          <DialogDescription>
            Watch a mailbox for new messages and expose them to your workflow.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4 px-8"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="gmailTrigger" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Reference the latest message using{" "}
                    <span className="text-white font-medium tracking-wide">
                      {`{{${field.value || "gmailTrigger"}.snippet}}`}
                    </span>
                    .
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="labelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label / mailbox</FormLabel>
                  <FormControl>
                    <Input placeholder="INBOX" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Common values: INBOX, STARRED, IMPORTANT, SENT, DRAFT.
                    Custom labels are supported too.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search query</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='from:billing@example.com subject:"Invoice" has:attachment'
                      className="min-h-[70px] text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 leading-5">
                    Optional Gmail search query to narrow results. Supports all
                    Gmail operators (from:, subject:, label:, newer_than:1d,
                    etc).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxResults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max results per poll</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={50} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Fetch up to this many messages each time we poll Gmail.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pollIntervalMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poll interval (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={60} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      How often this workflow should check Gmail for updates.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="includeSpamTrash"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-white/5 px-4 py-3">
                  <div>
                    <FormLabel>Include spam & trash</FormLabel>
                    <FormDescription className="text-xs">
                      Gmail ignores spam and trash by default. Enable if needed.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
