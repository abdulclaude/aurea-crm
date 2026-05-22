"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  ACQUISITION_STAGE_VALUES,
  CLIENT_TYPE_VALUES,
  INTRO_OFFER_REDEMPTION_STATUS_VALUES,
  LIFECYCLE_STAGE_VALUES,
} from "@/features/crm/constants";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Variable name must start with a letter or underscore.",
    }),
  email: z.string().optional(),
  name: z.string().optional(),
  companyName: z.string().optional(),
  type: z.enum(CLIENT_TYPE_VALUES).optional(),
  lifecycleStage: z.enum(LIFECYCLE_STAGE_VALUES).optional(),
  acquisitionStage: z.enum(ACQUISITION_STAGE_VALUES).optional(),
  tags: z.string().optional(),
  minAttendanceCount: z.number().int().min(0).optional(),
  maxAttendanceCount: z.number().int().min(0).optional(),
  introOfferStatus: z.enum(INTRO_OFFER_REDEMPTION_STATUS_VALUES).optional(),
  introOfferCompleted: z.boolean().optional(),
  limit: z.number().int().min(1).max(100),
});

export type FindClientsFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FindClientsFormValues) => void;
  defaultValues?: Partial<FindClientsFormValues>;
  variables: VariableItem[];
}

export const FindClientsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<FindClientsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "foundClients",
      email: defaultValues.email || "",
      name: defaultValues.name || "",
      companyName: defaultValues.companyName || "",
      type: defaultValues.type,
      lifecycleStage: defaultValues.lifecycleStage,
      acquisitionStage: defaultValues.acquisitionStage,
      tags: defaultValues.tags || "",
      minAttendanceCount: defaultValues.minAttendanceCount,
      maxAttendanceCount: defaultValues.maxAttendanceCount,
      introOfferStatus: defaultValues.introOfferStatus,
      introOfferCompleted: defaultValues.introOfferCompleted,
      limit: defaultValues.limit || 10,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "foundClients",
        email: defaultValues.email || "",
        name: defaultValues.name || "",
        companyName: defaultValues.companyName || "",
        type: defaultValues.type,
        lifecycleStage: defaultValues.lifecycleStage,
        acquisitionStage: defaultValues.acquisitionStage,
        tags: defaultValues.tags || "",
        minAttendanceCount: defaultValues.minAttendanceCount,
        maxAttendanceCount: defaultValues.maxAttendanceCount,
        introOfferStatus: defaultValues.introOfferStatus,
        introOfferCompleted: defaultValues.introOfferCompleted,
        limit: defaultValues.limit || 10,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: FindClientsFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-white/5">
        <SheetHeader className="px-6 pt-8 pb-1 gap-1">
          <SheetTitle>Find clients configuration</SheetTitle>
          <SheetDescription>
            Search for clients matching the specified criteria
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-5" />

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
                  <FormLabel>Variable name</FormLabel>
                  <FormControl>
                    <Input placeholder="foundClients" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px] mt-1">
                    Access the results array: <br />
                    <span className="text-primary font-medium tracking-wide">
                      {`@${field.value || "foundClients"}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="john@example.com"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Filter by email address
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
                  <FormLabel>Name (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="John Doe"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Filter by client name (partial match)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="Acme Corp"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Filter by company name (partial match)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client type (optional)</FormLabel>
                  <Select
                    value={field.value ?? "ANY"}
                    onValueChange={(value) =>
                      field.onChange(value === "ANY" ? undefined : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ANY">Any type</SelectItem>
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
                  <FormLabel>Lifecycle stage (optional)</FormLabel>
                  <Select
                    value={field.value ?? "ANY"}
                    onValueChange={(value) =>
                      field.onChange(value === "ANY" ? undefined : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ANY">Any stage</SelectItem>
                      <SelectItem value="SUBSCRIBER">
                        Subscriber
                      </SelectItem>
                      <SelectItem value="LEAD">Lead</SelectItem>
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

            <FormField
              control={form.control}
              name="acquisitionStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition stage (optional)</FormLabel>
                  <Select
                    value={field.value ?? "ANY"}
                    onValueChange={(value) =>
                      field.onChange(value === "ANY" ? undefined : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Any acquisition stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ANY">Any stage</SelectItem>
                      <SelectItem value="INQUIRY">
                        Inquiry
                      </SelectItem>
                      <SelectItem value="TRIAL">
                        Trial
                      </SelectItem>
                      <SelectItem value="ACTIVE">
                        Active
                      </SelectItem>
                      <SelectItem value="LOST">Lost</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="intro, vip, at-risk"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Comma-separated. Matches clients with any listed tag.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minAttendanceCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum classes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(
                            value ? Number.parseInt(value, 10) : undefined,
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAttendanceCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum classes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(
                            value ? Number.parseInt(value, 10) : undefined,
                          );
                        }}
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
                name="introOfferStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intro offer status</FormLabel>
                    <Select
                      value={field.value ?? "ANY"}
                      onValueChange={(value) =>
                        field.onChange(value === "ANY" ? undefined : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ANY">Any status</SelectItem>
                        <SelectItem value="ACTIVE">
                          Active
                        </SelectItem>
                        <SelectItem value="EXPIRED">
                          Expired
                        </SelectItem>
                        <SelectItem value="CONVERTED">
                          Converted
                        </SelectItem>
                        <SelectItem value="CANCELLED">
                          Cancelled
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="introOfferCompleted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intro credits completed</FormLabel>
                    <Select
                      value={
                        field.value === undefined
                          ? "ANY"
                          : field.value
                            ? "YES"
                            : "NO"
                      }
                      onValueChange={(value) => {
                        field.onChange(
                          value === "ANY" ? undefined : value === "YES",
                        );
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any completion" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ANY">Any completion</SelectItem>
                        <SelectItem value="YES">Completed</SelectItem>
                        <SelectItem value="NO">Not completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum results</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Maximum number of clients to return (1-100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0 pb-4">
              <Button type="submit" className="w-max ml-auto" variant="gradient">
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
