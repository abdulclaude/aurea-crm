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
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma/enums";
import Image from "next/image";

export const AVAILABLE_MODELS = ["gemini-2.5-flash"] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  model: z.enum(AVAILABLE_MODELS),
  credentialId: z.string().min(1, "Credential is required."),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1, "User prompt is required."),
});

export type GeminiFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<GeminiFormValues>;
}

export const GeminiDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}) => {
  const { data: credentials, isLoading } = useCredentialsByType(
    CredentialType.GEMINI
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      model: defaultValues.model || AVAILABLE_MODELS[0],
      credentialId: defaultValues.credentialId || "",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
    },
  });

  // reset form values when dialog opens with new defaults

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        model: defaultValues.model || AVAILABLE_MODELS[0],
        credentialId: defaultValues.credentialId || "",
        systemPrompt: defaultValues.systemPrompt || "",
        userPrompt: defaultValues.userPrompt || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-8">
          <DialogTitle> Gemini Configuration </DialogTitle>
          <DialogDescription>
            Configure the AI model and prompts for this node.
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
                      {`{{${field.value || "myApiCall"}.text}}`}
                    </span>{" "}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Model </FormLabel>

                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormDescription className="text-xs leading-5">
                    The Google Gemini model to use for completion.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> Gemini Credential </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a credential" />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {credentials?.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id}>
                          <Image
                            src="/logos/gemini.svg"
                            alt="Gemini"
                            width={16}
                            height={16}
                          />
                          {credential.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  xecu
                  <FormDescription className="text-xs leading-5">
                    The API key for your Google Gemini.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> System prompt (optional) </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"You are a helpful assistant."}
                      className="min-h-[80px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    Sets the behaviour of the assistant. <br /> Use{" "}
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

            <FormField
              control={form.control}
              name="userPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel> User prompt </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        "Summarize this text: {{json httpResponse.data}}"
                      }
                      className="min-h-[120px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>

                  <FormDescription className="text-xs mt-2 leading-5">
                    The prompt to send to the AI. <br /> Use{" "}
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

            <DialogFooter className="mt-4">
              <Button type="submit"> Save </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
