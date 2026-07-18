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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
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
  clientId: z.string().min(1, "Client ID is required"),
  name: z.string().optional(),
  email: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  type: z.enum(CLIENT_TYPE_VALUES).optional(),
  lifecycleStage: z.enum(LIFECYCLE_STAGE_VALUES).optional(),
  acquisitionStage: z.enum(ACQUISITION_STAGE_VALUES).optional(),
  source: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  tags: z.string().optional(),
  birthMonth: z.string().optional(),
  birthDay: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateClientFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdateClientFormValues) => void;
  defaultValues?: Partial<UpdateClientFormValues>;
  variables: VariableItem[];
}

export const UpdateClientDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const [useVariableInput, setUseVariableInput] = useState(false);
  const trpc = useTRPC();

  // Fetch clients list for Select mode
  const clientsQuery = useQuery(
    trpc.clients.list.queryOptions({
      cursor: undefined,
      limit: 100,
    })
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      clientId: defaultValues.clientId || "",
      name: defaultValues.name || "",
      email: defaultValues.email || "",
      companyName: defaultValues.companyName || "",
      phone: defaultValues.phone || "",
      position: defaultValues.position || "",
      type: defaultValues.type,
      lifecycleStage: defaultValues.lifecycleStage,
      acquisitionStage: defaultValues.acquisitionStage,
      source: defaultValues.source || "",
      website: defaultValues.website || "",
      linkedin: defaultValues.linkedin || "",
      country: defaultValues.country || "",
      city: defaultValues.city || "",
      tags: defaultValues.tags || "",
      birthMonth: defaultValues.birthMonth || "",
      birthDay: defaultValues.birthDay || "",
      notes: defaultValues.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        clientId: defaultValues.clientId || "",
        name: defaultValues.name || "",
        email: defaultValues.email || "",
        companyName: defaultValues.companyName || "",
        phone: defaultValues.phone || "",
        position: defaultValues.position || "",
        type: defaultValues.type,
        lifecycleStage: defaultValues.lifecycleStage,
        acquisitionStage: defaultValues.acquisitionStage,
        source: defaultValues.source || "",
        website: defaultValues.website || "",
        linkedin: defaultValues.linkedin || "",
        country: defaultValues.country || "",
        city: defaultValues.city || "",
        tags: defaultValues.tags || "",
        birthMonth: defaultValues.birthMonth || "",
        birthDay: defaultValues.birthDay || "",
        notes: defaultValues.notes || "",
      });
    }
  }, [
    open,
    defaultValues.variableName,
    defaultValues.clientId,
    defaultValues.name,
    defaultValues.email,
    defaultValues.companyName,
    defaultValues.phone,
    defaultValues.position,
    defaultValues.type,
    defaultValues.lifecycleStage,
    defaultValues.acquisitionStage,
    defaultValues.source,
    defaultValues.website,
    defaultValues.linkedin,
    defaultValues.country,
    defaultValues.city,
    defaultValues.tags,
    defaultValues.birthMonth,
    defaultValues.birthDay,
    defaultValues.notes,
    form,
  ]);

  const handleSubmit = (values: UpdateClientFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-border">
        <SheetHeader className="px-6 p-6 pb-2 gap-1">
          <SheetTitle>Update Client Configuration</SheetTitle>
          <SheetDescription>
            Update an existing client in your CRM. Only fill in fields you want
            to update.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4 bg-border" />

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
                    <Input placeholder="myClient" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the updated client in other nodes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Client ID</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="use-variable-client"
                        className="text-xs text-primary/75 cursor-pointer"
                      >
                        Use variables
                      </Label>
                      <Switch
                        id="use-variable-client"
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
                        placeholder="Type @variables to insert variables"
                        className="h-13"
                        variables={variables}
                      />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={clientsQuery.isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              clientsQuery.isLoading
                                ? "Loading clients..."
                                : "Select a client"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {clientsQuery.data?.items?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {client.name}
                                </span>
                                {client.email && (
                                  <span className="text-xs text-primary/75">
                                    {client.email}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )) ?? (
                            <div className="px-2 py-4 text-sm text-primary/75">
                              No clients found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormDescription>
                    {useVariableInput ? (
                      <>
                        Type <span className="text-primary font-medium">@</span>{" "}
                        or <span className="text-primary font-medium">/</span>{" "}
                        to insert context variables
                      </>
                    ) : (
                      "Select an existing client from your CRM"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <p className="text-sm text-primary/75">
              Optional: Fill only the fields you want to update
            </p>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="John Doe or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
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
                    <FormLabel>Email (optional)</FormLabel>
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
                    <FormLabel>Phone (optional)</FormLabel>
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type (optional)</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Leave unchanged" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LEAD">Lead</SelectItem>
                        <SelectItem value="PROSPECT">
                          Prospect
                        </SelectItem>
                        <SelectItem value="CUSTOMER">
                          Customer
                        </SelectItem>
                        <SelectItem value="CHURN">Churn</SelectItem>
                        <SelectItem value="CLOSED">
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
                    <FormLabel>Lifecycle Stage (optional)</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Leave unchanged" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SUBSCRIBER">
                          Subscriber
                        </SelectItem>
                        <SelectItem value="LEAD">
                          Lead
                        </SelectItem>
                        <SelectItem value="MQL">MQL</SelectItem>
                        <SelectItem value="SQL">SQL</SelectItem>
                        <SelectItem value="OPPORTUNITY">
                          Opportunity
                        </SelectItem>
                        <SelectItem value="CUSTOMER">
                          Customer
                        </SelectItem>
                        <SelectItem value="EVANGELIST">
                          Evangelist
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acquisitionStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition stage (optional)</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || undefined)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Leave unchanged" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INQUIRY">
                        Inquiry
                      </SelectItem>
                      <SelectItem value="TRIAL">
                        Trial
                      </SelectItem>
                      <SelectItem value="ACTIVE">
                        Active
                      </SelectItem>
                      <SelectItem value="LOST">
                        Lost
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Trial and active stages stamp the matching conversion dates.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="intro-offer, active-member or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Comma-separated list. This replaces the client tag set.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth month</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="1-12 or @variables"
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
                name="birthDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth day</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="1-31 or @variables"
                        className="h-13"
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
                  <FormLabel>Add note (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Add a note to this client or @variables"
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
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
