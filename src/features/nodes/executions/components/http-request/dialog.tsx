"use client";

import { useForm } from "react-hook-form";

import { useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  endpoint: z.url({ message: "Please enter a valid URL." }),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  body: z.string().optional(),
});

export type HttpRequestFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<HttpRequestFormValues>;
}

export const HttpRequestDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      endpoint: defaultValues.endpoint || "",
      method: defaultValues.method || "GET",
      body: defaultValues.body || "",
    },
  });

  // reset form values when dialog opens with new defaults

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        endpoint: defaultValues.endpoint || "",
        method: defaultValues.method || "GET",
        body: defaultValues.body || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchMethod = form.watch("method");
  const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle> HTTP Request </DialogTitle>
          <DialogDescription>
            Configure settings for the HTTP Request node.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4 px-8"
          >
            {/* variable name */}

            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Variable Name </FormLabel>
                  <FormControl>
                    <Input placeholder="myApiCall" {...field} />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    Use this name to reference the result in other nodes: <br />
                    <span className="text-primary font-medium tracking-wide">
                      {`{{${field.value || "myApiCall"}.httpResponse.data}}`}
                    </span>{" "}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Method */}

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Method </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a method" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="GET"> GET </SelectItem>
                      <SelectItem value="POST"> POST </SelectItem>
                      <SelectItem value="PUT"> PUT </SelectItem>
                      <SelectItem value="PATCH"> PATCH </SelectItem>
                      <SelectItem value="DELETE"> DELETE </SelectItem>
                    </SelectContent>
                  </Select>

                  <FormDescription className="text-xs mt-2">
                    The{" "}
                    <span className="text-primary font-medium">
                      {" "}
                      HTTP method{" "}
                    </span>{" "}
                    to use for this request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* endpoint */}

            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Endpoint URL </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://api.example.com/users/{{httpResponse.data.id}}"
                      {...field}
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    Static URL or use{" "}
                    <span className="text-primary font-medium tracking-wide">
                      {"{{variables}}"}
                    </span>{" "}
                    for simple values.
                    <br /> Alternatively, use{" "}
                    <span className="text-primary font-medium tracking-wide">
                      {"{{json variable}}"}
                    </span>{" "}
                    to stringify objects.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showBodyField && (
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel> Body </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          '{\n "userId": "{{httpResponse.data.id}}"\n "name": "{{httpResponse.data.name}}",\n "items": "{{httpResponse.data.items}}"\n}'
                        }
                        className="min-h-[120px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>

                    <FormDescription className="text-xs mt-2 leading-5">
                      JSON with template variabes. <br /> Use{" "}
                      <span className="text-primary font-medium tracking-wide">
                        {"{{variables}}"}
                      </span>{" "}
                      for simple values.
                      <br /> Alternatively, use{" "}
                      <span className="text-primary font-medium tracking-wide">
                        {"{{json variable}}"}
                      </span>{" "}
                      to stringify objects.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="mt-4">
              <Button type="submit"> Save </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
