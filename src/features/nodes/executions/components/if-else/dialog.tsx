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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required." })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  leftOperand: z.string().min(1, { message: "Left operand is required." }),
  operator: z.enum([
    "equals",
    "notEquals",
    "greaterThan",
    "lessThan",
    "greaterThanOrEqual",
    "lessThanOrEqual",
    "contains",
    "notContains",
    "startsWith",
    "endsWith",
    "isEmpty",
    "isNotEmpty",
  ]),
  rightOperand: z.string().optional(),
});

export type IfElseFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IfElseFormValues) => void;
  defaultValues?: Partial<IfElseFormValues>;
  variables: VariableItem[];
}

export const IfElseDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "condition",
      leftOperand: defaultValues.leftOperand || "",
      operator: defaultValues.operator || "equals",
      rightOperand: defaultValues.rightOperand || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "condition",
        leftOperand: defaultValues.leftOperand || "",
        operator: defaultValues.operator || "equals",
        rightOperand: defaultValues.rightOperand || "",
      });
    }
  }, [open, defaultValues.variableName, defaultValues.leftOperand, defaultValues.operator, defaultValues.rightOperand, form]);

  const watchOperator = form.watch("operator");
  const showRightOperand = !["isEmpty", "isNotEmpty"].includes(watchOperator);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-black/10">
        <SheetHeader className="px-6 p-6 pb-2 gap-1">
          <SheetTitle>IF / ELSE Configuration</SheetTitle>
          <SheetDescription>
            Split workflow into two branches based on a condition.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4 bg-black/10" />

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
                    <Input placeholder="condition" {...field} />
                  </FormControl>

                  <FormDescription className="text-xs leading-5">
                    Store the result (true/false) to reference later:
                    <span className="text-primary font-medium tracking-wide ml-1">
                      {`@${field.value || "condition"}`}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leftOperand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Left Operand</FormLabel>
                  <FormControl>
                    <VariableInput
                      placeholder="{{contact.email}}"
                      value={field.value || ""}
                      onChange={field.onChange}
                      variables={variables}
                      className="h-13"
                    />
                  </FormControl>
                  <FormDescription className="text-xs leading-5">
                    The value to check. Use{" "}
                    <span className="text-primary font-medium tracking-wide">
                      {"@variables"}
                    </span>{" "}
                    from previous nodes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operator</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an operator" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="equals">Equals (=)</SelectItem>
                      <SelectItem value="notEquals">Not Equals (≠)</SelectItem>
                      <SelectItem value="greaterThan">
                        Greater Than (&gt;)
                      </SelectItem>
                      <SelectItem value="lessThan">Less Than (&lt;)</SelectItem>
                      <SelectItem value="greaterThanOrEqual">
                        Greater Than or Equal (≥)
                      </SelectItem>
                      <SelectItem value="lessThanOrEqual">
                        Less Than or Equal (≤)
                      </SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="notContains">Not Contains</SelectItem>
                      <SelectItem value="startsWith">Starts With</SelectItem>
                      <SelectItem value="endsWith">Ends With</SelectItem>
                      <SelectItem value="isEmpty">Is Empty</SelectItem>
                      <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                    </SelectContent>
                  </Select>

                  <FormDescription className="text-xs ">
                    The comparison operator to use
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showRightOperand && (
              <FormField
                control={form.control}
                name="rightOperand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Right Operand</FormLabel>
                    <FormControl>
                      <VariableInput
                        placeholder="500 or {{deal.value}}"
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        className="h-13"
                      />
                    </FormControl>
                    <FormDescription className="text-xs  leading-5">
                      The value to compare against. Can be static or use{" "}
                      <span className="text-primary font-medium tracking-wide">
                        {"@variables"}
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="bg-primary-foreground/75 border border-primary/20 rounded p-3 px-3">
              <p className="text-xs text-primary">
                Connect nodes to the TRUE and FALSE outputs to create two
                separate branches. The workflow will follow the TRUE branch if
                the condition matches, otherwise the FALSE branch.
              </p>
            </div>

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
