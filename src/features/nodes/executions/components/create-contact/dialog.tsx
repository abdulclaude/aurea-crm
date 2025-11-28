"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactType, LifecycleStage } from "@/generated/prisma/enums";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  name: z.string().min(1, "Name is required"),
  email: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  type: z.enum(ContactType).optional(),
  lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
  source: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateContactFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<CreateContactFormValues>;
  variables: VariableItem[];
}

export const CreateContactDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      name: defaultValues.name || "",
      email: defaultValues.email || "",
      companyName: defaultValues.companyName || "",
      phone: defaultValues.phone || "",
      position: defaultValues.position || "",
      type: defaultValues.type || ContactType.LEAD,
      lifecycleStage: defaultValues.lifecycleStage,
      source: defaultValues.source || "",
      website: defaultValues.website || "",
      linkedin: defaultValues.linkedin || "",
      country: defaultValues.country || "",
      city: defaultValues.city || "",
      notes: defaultValues.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        name: defaultValues.name || "",
        email: defaultValues.email || "",
        companyName: defaultValues.companyName || "",
        phone: defaultValues.phone || "",
        position: defaultValues.position || "",
        type: defaultValues.type || ContactType.LEAD,
        lifecycleStage: defaultValues.lifecycleStage,
        source: defaultValues.source || "",
        website: defaultValues.website || "",
        linkedin: defaultValues.linkedin || "",
        country: defaultValues.country || "",
        city: defaultValues.city || "",
        notes: defaultValues.notes || "",
      });
    }
  }, [
    open,
    defaultValues.variableName,
    defaultValues.name,
    defaultValues.email,
    defaultValues.companyName,
    defaultValues.phone,
    defaultValues.position,
    defaultValues.type,
    defaultValues.lifecycleStage,
    defaultValues.source,
    defaultValues.website,
    defaultValues.linkedin,
    defaultValues.country,
    defaultValues.city,
    defaultValues.notes,
    form,
  ]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-black/10">
        <SheetHeader className="px-6 p-6 pb-2 gap-1">
          <SheetTitle>Create Contact Configuration</SheetTitle>
          <SheetDescription>
            Configure the contact details to create in your CRM.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4 bg-black/10" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6 pb-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myContact" {...field} />
                  </FormControl>

                  <FormDescription>
                    You can reference this contact in other nodes using the
                    variable name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="John Doe or type @variables to insert variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>

                  <FormDescription>
                    Type <span className="text-primary font-medium">@</span> or{" "}
                    <span className="text-primary font-medium">/</span> to
                    insert context variables
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="john@example.com or @variables"
                        className="h-13"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="+1234567890 or @variables"
                        className="h-13"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Acme Inc or @variables"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="CEO or @variables"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value={ContactType.LEAD}>Lead</SelectItem>
                        <SelectItem value={ContactType.PROSPECT}>
                          Prospect
                        </SelectItem>
                        <SelectItem value={ContactType.CUSTOMER}>
                          Customer
                        </SelectItem>
                        <SelectItem value={ContactType.CHURN}>Churn</SelectItem>
                        <SelectItem value={ContactType.CLOSED}>
                          Closed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lifecycleStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lifecycle Stage </FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value={LifecycleStage.SUBSCRIBER}>
                          Subscriber
                        </SelectItem>
                        <SelectItem value={LifecycleStage.LEAD}>
                          Lead
                        </SelectItem>
                        <SelectItem value={LifecycleStage.MQL}>MQL</SelectItem>
                        <SelectItem value={LifecycleStage.SQL}>SQL</SelectItem>
                        <SelectItem value={LifecycleStage.OPPORTUNITY}>
                          Opportunity
                        </SelectItem>
                        <SelectItem value={LifecycleStage.CUSTOMER}>
                          Customer
                        </SelectItem>
                        <SelectItem value={LifecycleStage.EVANGELIST}>
                          Evangelist
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Google Form or @variables"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="https://example.com or @variables"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="United States or @variables"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City </FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="San Francisco or @variables"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Additional notes about this contact or @variables"
                      variables={variables}
                      className="h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormDescription className="text-xs leading-5">
              Use{" "}
              <span className="text-primary font-medium tracking-wide">
                {"@variables"}
              </span>{" "}
              to reference data from previous nodes.
            </FormDescription>

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="bg-primary-foreground hover:bg-primary/10 hover:text-black text-primary w-full"
              >
                {" "}
                Save changes{" "}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
