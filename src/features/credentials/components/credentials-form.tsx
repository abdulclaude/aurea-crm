"use client";

import { CredentialType } from "@/db/enums";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import {
  useCreateCredential,
  useSuspenseCredential,
  useUpdateCredential,
} from "../hooks/use-credentials";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(CredentialType),
  value: z.string(),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const credentialTypeOptions = [
  {
    value: CredentialType.GEMINI,
    label: "Gemini",
    logo: "/logos/gemini.svg",
  },
  {
    value: CredentialType.OPENAI,
    label: "OpenAI",
    logo: "/logos/openai.svg",
  },
  {
    value: CredentialType.ANTHROPIC,
    label: "Anthropic",
    logo: "/logos/anthropic.svg",
  },
  {
    value: CredentialType.TELEGRAM_BOT,
    label: "Telegram Bot",
    logo: "/logos/telegram.svg",
  },
];

interface CredentialFormProps {
  initialData?: {
    id?: string;
    name: string;
    type: CredentialType;
    value: string;
    isDefault: boolean;
  };
}

const CredentialForm: React.FC<CredentialFormProps> = ({ initialData }) => {
  const router = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();

  const isEdit = !!initialData?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      type: CredentialType.GEMINI,
      value: "",
      isDefault: false,
    },
  });

  const selectedType = form.watch("type");
  const isAiCredential =
    selectedType === CredentialType.GEMINI ||
    selectedType === CredentialType.OPENAI ||
    selectedType === CredentialType.ANTHROPIC;
  const valueLabel =
    selectedType === CredentialType.TELEGRAM_BOT ? "Bot token" : "API Key";
  const valuePlaceholder =
    selectedType === CredentialType.TELEGRAM_BOT
      ? "123456789:ABC..."
      : "AIza...";

  const onSubmit = async (values: FormValues) => {
    if (!isEdit && !values.value.trim()) {
      form.setError("value", { message: `${valueLabel} is required` });
      return;
    }
    if (isEdit && initialData?.id) {
      await updateCredential.mutateAsync({
        id: initialData.id,
        ...values,
      });
    } else {
      await createCredential.mutateAsync(values, {
        onSuccess: (data) => {
          toast.success(`Credential "${data.name}" successfully created.`);
          router.push(`/credentials/${data.id}`);
        },
        onError: (error) => toast.error(error.message),
      });
    }
  };

  return (
    <>
      <Card className="shadow-none px-0">
        <CardHeader>
          <CardTitle>
            {isEdit ? "Edit credential" : "Create credential"}
          </CardTitle>

          <CardDescription>
            {isEdit
              ? "Update your API key or credential details"
              : "Add a new API key to your account"}
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>

                    <FormControl>
                      <Input placeholder="My API Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>

                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {credentialTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Image
                                src={option.logo}
                                alt={option.label}
                                width={16}
                                height={16}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{valueLabel}</FormLabel>

                    <FormControl>
                      <Input
                        type="password"
                        placeholder={
                          isEdit
                            ? `Leave blank to keep the current ${valueLabel.toLowerCase()}`
                            : valuePlaceholder
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAiCredential ? (
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 border-y py-4">
                      <div className="space-y-1">
                        <FormLabel>Default for this account</FormLabel>
                        <FormDescription>
                          Use this credential for Aurea AI in the active account.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Use as the default AI credential"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : null}

              <div className="flex gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/settings/credentials" prefetch>
                    Cancel
                  </Link>
                </Button>

                <Button
                  type="submit"
                  disabled={
                    createCredential.isPending || updateCredential.isPending
                  }
                >
                  {" "}
                  {isEdit ? "Update" : "Create"}{" "}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};

export default CredentialForm;

export const CredentialView = ({ credentialId }: { credentialId: string }) => {
  const params = useParams();
  const { data: credential } = useSuspenseCredential(credentialId);

  return <CredentialForm initialData={credential} />;
};
