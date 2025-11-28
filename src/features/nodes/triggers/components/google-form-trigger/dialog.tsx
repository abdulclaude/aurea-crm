"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { generateGoogleFormScript } from "./utils";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TagsInput } from "@/components/ui/tags-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  formFields: z.array(z.string()).default([]),
});

export type GoogleFormTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleFormTriggerFormValues) => void;
  defaultValues?: Partial<GoogleFormTriggerFormValues>;
  variables: VariableItem[];
}

export const GoogleFormTriggerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const params = useParams();
  const workflowId = params.workflowId as string;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      variableName: defaultValues.variableName || "",
      formFields: defaultValues.formFields || [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        formFields: defaultValues.formFields || [],
      });
    }
  }, [open, defaultValues.variableName, defaultValues.formFields, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // construct the webhook url
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/google-form?workflowId=${workflowId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied to clipboard.");
    } catch {
      toast.error("Failed to copy URL, please try again later.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-black/10">
        <SheetHeader className="px-6 p-6 pb-2 gap-1">
          <SheetTitle>Google Form Trigger</SheetTitle>
          <SheetDescription>
            Use this webhook URL in your Google Form's app script to trigger
            this workflow when a form is submitted.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4 bg-black/10" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6 pb-6"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="googleForm" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs mt-2 leading-5">
                      Reference this form data in other nodes: <br />
                      <span className="text-primary font-medium tracking-wide">
                        {`{{${field.value || "googleForm"}.respondentEmail}}`}
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="formFields"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Fields</FormLabel>
                    <FormControl>
                      <TagsInput
                        value={field.value}
                        className="bg-background rounded-sm border border-black/10"
                        onChange={field.onChange}
                        placeholder="Add field name (e.g., Name, Email, Phone)..."
                      />
                    </FormControl>

                    <FormDescription className="text-[11px] mt-1 leading-4.5 text-primary/75">
                      Add the question names from your Google Form. These will
                      be available as variables in other nodes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4 bg-black/10" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="webhook-url"
                  className="text-xs text-primary/75"
                >
                  Webhook URL
                </Label>

                <div className="flex gap-2">
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button type="button" size="icon" onClick={copyToClipboard}>
                    <CopyIcon className="size-3 text-primary/75 hover:text-primary" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-4 bg-black/10" />

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-primary">
                {" "}
                Setup instructions{" "}
              </h4>
              <ul className="text-xs text-primary/75 space-y-2 pl-3">
                <li> Fill out your Google Form </li>

                <li className="flex items-center gap-0.5">
                  {" "}
                  Click on the three dots menu{" "}
                  <ChevronRight className="size-3 text-primary" />{" "}
                  <span className="text-primary font-medium"> App Scripts</span>{" "}
                </li>

                <li> Copy and paste the script below and save </li>
                <li className="flex items-center gap-1">
                  Click Triggers{" "}
                  <ChevronRight className="size-3 text-primary" />
                  <span className="text-primary font-medium">
                    Add Trigger
                  </span>{" "}
                </li>
                <li className="flex items-center gap-1">
                  {" "}
                  Choose:{" "}
                  <span className="text-primary font-medium">
                    From form
                  </span>{" "}
                  <ChevronRight className="size-3 text-primary" />
                  <span className="text-primary font-medium">
                    On Form Submit
                  </span>{" "}
                  <ChevronRight className="size-3 text-primary" />{" "}
                  <span className="text-primary font-medium">Save</span>{" "}
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm text-primary">
                {" "}
                Google Apps Script:{" "}
              </h4>
              <Button
                type="button"
                className="text-xs rounded-sm bg-primary-foreground hover:bg-primary/10 hover:text-black text-primary"
                onClick={async () => {
                  const script = generateGoogleFormScript(webhookUrl);

                  try {
                    await navigator.clipboard.writeText(script);
                    toast.success("Script copied to clipboard.");
                  } catch {
                    toast.error(
                      "Failed to copy script to clipboard, please try again later."
                    );
                  }
                }}
              >
                <CopyIcon className="size-3 mr-1 text-primary   " />
                Copy Google Apps Script
              </Button>

              <p className="text-xs text-primary/75">
                {" "}
                This script includes your Webhook URL and handles form
                submissions
              </p>
            </div>

            {/* <div className="px-8 space-y-2">
              <h4 className="font-medium text-sm"> Available variables </h4>
              <ul className="text-xs text-white/40 space-y-4">
                <li>
                  {" "}
                  <code className="bg-[#202e32] px-1 py-0.5 rounded text-white font-medium">
                    {`{{${
                      form.watch("variableName") || "googleForm"
                    }.respondentEmail}}`}
                  </code>{" "}
                  - Respondent's email
                </li>

                <li>
                  {" "}
                  <code className="bg-[#202e32] px-1 py-0.5 rounded text-white font-medium">
                    {`{{${
                      form.watch("variableName") || "googleForm"
                    }.responses['Question Name']}}`}
                  </code>{" "}
                  - Access specific answer
                </li>

                <li>
                  {" "}
                  <code className="bg-[#202e32] px-1 py-0.5 rounded text-white font-medium">
                    {`{{json ${
                      form.watch("variableName") || "googleForm"
                    }.responses}}`}
                  </code>{" "}
                  - Access all responses as JSON
                </li>
              </ul>
            </div> */}

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="bg-primary-foreground hover:bg-primary/10 hover:text-black text-primary w-full py-5"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
