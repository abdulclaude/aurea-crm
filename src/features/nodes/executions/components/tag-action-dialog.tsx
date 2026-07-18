"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StudioNodeDialogFooter,
  StudioNodeDialogLayout,
} from "@/features/nodes/studio/components/studio-node-dialog-layout";
import { StudioResourceCheckboxList } from "@/features/nodes/studio/components/studio-resource-checkbox-list";
import { useTRPC } from "@/trpc/client";

export const tagActionSchema = z
  .object({
    variableName: z
      .string()
      .min(1, "Result variable is required")
      .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
    clientId: z.string().min(1, "Choose a member"),
    tag: z.string().trim().optional(),
    tags: z.array(z.string().trim().min(1)),
  })
  .superRefine((value, context) => {
    if (!value.tag && value.tags.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Choose at least one tag or use a variable",
        path: ["tags"],
      });
    }
  });

export type TagActionValues = z.infer<typeof tagActionSchema>;

export function TagActionDialog(props: {
  action: "add" | "remove";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TagActionValues) => void;
  defaultValues?: Partial<TagActionValues>;
  variables: VariableItem[];
}): React.ReactElement {
  const trpc = useTRPC();
  const [memberSource, setMemberSource] = useState<"workflow" | "select">(
    "workflow",
  );
  const [tagSource, setTagSource] = useState<"select" | "variable">("select");
  const clientsQuery = useQuery({
    ...trpc.clients.list.queryOptions({ cursor: undefined, limit: 100 }),
    enabled: props.open && memberSource === "select",
  });
  const optionsQuery = useQuery({
    ...trpc.workflows.conditionOptions.queryOptions(),
    enabled: props.open,
  });
  const form = useForm<TagActionValues>({
    resolver: zodResolver(tagActionSchema),
    defaultValues: defaults(props.defaultValues),
  });
  const selectedTags = form.watch("tags");

  useEffect(() => {
    if (!props.open) return;
    const values = defaults(props.defaultValues);
    form.reset(values);
    setMemberSource(values.clientId.includes("{{") ? "workflow" : "select");
    setTagSource(values.tag?.includes("{{") ? "variable" : "select");
  }, [form, props.defaultValues, props.open]);

  const verb = props.action === "add" ? "Add" : "Remove";
  return (
    <StudioNodeDialogLayout
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`${verb} tag`}
      description={`${verb} one or more existing workspace tags on a workflow member.`}
    >
      <Form {...form}>
        <form
          className="space-y-6 px-6"
          onSubmit={form.handleSubmit((values) => {
            props.onSubmit(values);
            props.onOpenChange(false);
          })}
        >
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member</FormLabel>
                <Tabs
                  value={memberSource}
                  onValueChange={(value) =>
                    setMemberSource(value === "select" ? "select" : "workflow")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="workflow">From workflow</TabsTrigger>
                    <TabsTrigger value="select">Select member</TabsTrigger>
                  </TabsList>
                  <TabsContent value="workflow">
                    <FormControl>
                      <VariableInput
                        value={field.value}
                        onChange={field.onChange}
                        variables={props.variables}
                        placeholder="Choose the member from a previous step"
                        ariaLabel="Member from workflow"
                        className="min-h-11"
                      />
                    </FormControl>
                  </TabsContent>
                  <TabsContent value="select">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              clientsQuery.isLoading
                                ? "Loading members..."
                                : "Select a member"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientsQuery.data?.items.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                            {member.email ? ` - ${member.email}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                </Tabs>
                <FormDescription>
                  Workflow variables only come from the trigger and connected
                  previous steps. Select a fixed CRM member only for deliberate
                  one-person automations.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={() => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <Tabs
                  value={tagSource}
                  onValueChange={(value) =>
                    setTagSource(value === "variable" ? "variable" : "select")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="select">Choose existing</TabsTrigger>
                    <TabsTrigger value="variable">Use variable</TabsTrigger>
                  </TabsList>
                  <TabsContent value="select">
                    <StudioResourceCheckboxList
                      options={(optionsQuery.data?.tags ?? []).map((tag) => ({
                        id: tag,
                        label: tag,
                      }))}
                      selectedIds={selectedTags}
                      loading={optionsQuery.isLoading}
                      emptyMessage="No workspace tags exist yet. Use a variable or create a tag on a member."
                      onToggle={(tag, selected) => {
                        form.setValue(
                          "tags",
                          selected
                            ? Array.from(new Set([...selectedTags, tag]))
                            : selectedTags.filter((value) => value !== tag),
                          { shouldDirty: true, shouldValidate: true },
                        );
                        form.setValue("tag", "", { shouldDirty: true });
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="variable">
                    <FormField
                      control={form.control}
                      name="tag"
                      render={({ field }) => (
                        <FormControl>
                          <VariableInput
                            value={field.value || ""}
                            onChange={(value) => {
                              field.onChange(value);
                              form.setValue("tags", [], { shouldDirty: true });
                            }}
                            variables={props.variables}
                            placeholder="Choose a tag value from a previous step"
                            ariaLabel="Tag variable"
                            className="min-h-11"
                          />
                        </FormControl>
                      )}
                    />
                  </TabsContent>
                </Tabs>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Result variable</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Advanced steps can reference the updated member with this
                  name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <StudioNodeDialogFooter />
        </form>
      </Form>
    </StudioNodeDialogLayout>
  );
}

function defaults(values: Partial<TagActionValues> = {}): TagActionValues {
  return {
    variableName: values.variableName || "updatedClient",
    clientId: values.clientId || "",
    tag: values.tag || "",
    tags:
      values.tags ??
      (values.tag && !values.tag.includes("{{") ? [values.tag] : []),
  };
}
