"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  contactId: z.string().min(1, "Contact ID is required"),
});

export type DeleteContactFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<DeleteContactFormValues>;
  variables: VariableItem[];
}

export const DeleteContactDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const [useVariableInput, setUseVariableInput] = useState(false);
  const trpc = useTRPC();

  // Fetch contacts list for Select mode
  const contactsQuery = useQuery(
    trpc.contacts.list.queryOptions({
      cursor: undefined,
      limit: 100,
    })
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      contactId: defaultValues.contactId || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        contactId: defaultValues.contactId || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.contactId, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-[#202e32] border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Delete Contact Configuration</SheetTitle>
          <SheetDescription>
            Delete a contact from your CRM. This action cannot be undone.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5 bg-white/5" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myDeletedContact" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the deletion result in other nodes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Contact ID</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="use-variable-delete-contact" className="text-xs text-white/60 cursor-pointer">
                        Use variables
                      </Label>
                      <Switch
                        id="use-variable-delete-contact"
                        checked={useVariableInput}
                        onCheckedChange={setUseVariableInput}
                      />
                    </div>
                  </div>
                  <FormControl>
                    {useVariableInput ? (
                      <VariableInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Type @ to insert variables"
                        className="h-13"
                        variables={variables}
                      />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={contactsQuery.isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={contactsQuery.isLoading ? "Loading contacts..." : "Select a contact to delete"} />
                        </SelectTrigger>
                        <SelectContent>
                          {contactsQuery.data?.items?.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{contact.name}</span>
                                {contact.email && (
                                  <span className="text-xs text-white/60">{contact.email}</span>
                                )}
                              </div>
                            </SelectItem>
                          )) ?? (
                            <div className="px-2 py-4 text-sm text-white/60">No contacts found</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormDescription>
                    {useVariableInput ? (
                      <>
                        Type <span className="text-white font-medium">@</span> or{" "}
                        <span className="text-white font-medium">/</span> to insert
                        context variables. This action is permanent.
                      </>
                    ) : (
                      "Select a contact to permanently delete from your CRM"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-red-500/10 border border-red-500/20 rounded p-4">
              <p className="text-sm text-red-200">
                Warning: Deleting a contact will permanently remove it from your
                CRM and cannot be undone.
              </p>
            </div>

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                variant="destructive"
                className="w-full py-5"
              >
                Save Configuration
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
