"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ResizableSheetContent,
  Sheet,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  loopType: z.enum(["array", "count"]),
  arrayInput: z.string().optional(),
  countInput: z.string().optional(),
  itemVariableName: z.string().min(1, "Item variable name is required"),
  indexVariableName: z.string().optional(),
});

export type LoopFormValues = z.infer<typeof formSchema>;

interface LoopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LoopFormValues) => void;
  defaultValues?: Partial<LoopFormValues>;
  variables?: VariableItem[];
}

export const LoopDialog: React.FC<LoopDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  variables = [],
}) => {
  const form = useForm<LoopFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "loopResult",
      loopType: defaultValues?.loopType || "array",
      arrayInput: defaultValues?.arrayInput || "",
      countInput: defaultValues?.countInput || "10",
      itemVariableName: defaultValues?.itemVariableName || "item",
      indexVariableName: defaultValues?.indexVariableName || "index",
    },
  });

  const loopType = form.watch("loopType");

  const handleSubmit = (values: LoopFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-black/10">
        <SheetHeader>
          <SheetTitle>Configure Loop Node</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="loopResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Name for storing loop results
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loopType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loop Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select loop type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="array">Loop over Array</SelectItem>
                      <SelectItem value="count">Loop N Times</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {loopType === "array" ? (
              <FormField
                control={form.control}
                name="arrayInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Array to Loop Over</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        placeholder="Select array variable..."
                      />
                    </FormControl>
                    <FormDescription>
                      Variable containing an array to iterate over
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="countInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Iterations</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        variables={variables}
                        placeholder="Enter number or variable..."
                      />
                    </FormControl>
                    <FormDescription>
                      How many times to repeat the loop
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="itemVariableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {loopType === "array"
                      ? "Item Variable Name"
                      : "Current Value Variable"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={loopType === "array" ? "item" : "current"}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {loopType === "array"
                      ? "Variable name for each array item"
                      : "Variable name for current iteration number (0-based)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="indexVariableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Index Variable Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="index" {...field} />
                  </FormControl>
                  <FormDescription>
                    Variable name for the loop index
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
