"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TagsInput } from "@/components/ui/tags-input";
import { useTRPC } from "@/trpc/client";

const personalInfoSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  email: z.union([z.email("Enter a valid email"), z.literal("")]),
  phone: z.string(),
  country: z.string(),
  city: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
});

type PersonalInfoValues = z.infer<typeof personalInfoSchema>;

export function MemberPersonalInfoView({ clientId }: { clientId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const clientQuery = useQuery(trpc.clients.getById.queryOptions({ id: clientId }));
  const client = clientQuery.data;
  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    values: {
      name: client?.name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      country: client?.country ?? "",
      city: client?.city ?? "",
      source: client?.source ?? "",
      tags: client?.tags ?? [],
    },
  });
  const updateClient = useMutation(
    trpc.clients.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.clients.getById.queryKey({ id: clientId }),
        });
        toast.success("Personal information saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (clientQuery.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-xs text-primary/50">
        <LoaderCircle className="size-3.5 animate-spin" /> Loading personal information...
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        className="mx-auto max-w-4xl space-y-6 py-6"
        onSubmit={form.handleSubmit((values) =>
          updateClient.mutate({ id: clientId, ...values }),
        )}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <PersonalField control={form.control} name="name" label="Full name" />
          <PersonalField control={form.control} name="email" label="Email" type="email" />
          <PersonalField control={form.control} name="phone" label="Phone" />
          <PersonalField control={form.control} name="country" label="Country" />
          <PersonalField control={form.control} name="city" label="City" />
          <PersonalField control={form.control} name="source" label="Source" />
        </div>
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <TagsInput value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="gradient" className="w-max" size="sm" disabled={updateClient.isPending}>
            {updateClient.isPending ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
<></>
            )}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  );
}

type PersonalFieldProps = {
  control: ReturnType<typeof useForm<PersonalInfoValues>>["control"];
  label: string;
  name: "name" | "email" | "phone" | "country" | "city" | "source";
  type?: string;
};

function PersonalField({ control, label, name, type }: PersonalFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} type={type} className="text-xs" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
