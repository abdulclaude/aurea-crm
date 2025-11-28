"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ContactType, LifecycleStage } from "@prisma/client";
import { useTRPC } from "@/trpc/client";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  logo: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  position: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  score: z.string().optional(),
  type: z.enum(Object.values(ContactType) as [string, ...string[]]).optional(),
  lifecycleStage: z
    .enum(Object.values(LifecycleStage) as [string, ...string[]])
    .optional(),
  source: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewContactPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      logo: "",
      companyName: "",
      email: "",
      position: "",
      phone: "",
      country: "",
      city: "",
      score: "",
      type: ContactType.LEAD,
      lifecycleStage: undefined,
      source: "",
      website: "",
      linkedin: "",
      notes: "",
    },
  });

  const createContact = useMutation(
    trpc.contacts.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Contact created successfully");
        router.push("/contacts");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create contact");
      },
    })
  );

  const onSubmit = async (values: FormValues) => {
    const clean = {
      name: values.name.trim(),
      logo: values.logo?.trim() ? values.logo.trim() : undefined,
      companyName: values.companyName?.trim()
        ? values.companyName.trim()
        : undefined,
      email: values.email?.trim() ? values.email.trim() : undefined,
      position: values.position?.trim() ? values.position.trim() : undefined,
      phone: values.phone?.trim() ? values.phone.trim() : undefined,
      country: values.country?.trim() ? values.country.trim() : undefined,
      city: values.city?.trim() ? values.city.trim() : undefined,
      score: values.score?.trim()
        ? Number.parseInt(values.score.trim(), 10)
        : undefined,
      type: values.type as ContactType | undefined,
      lifecycleStage: values.lifecycleStage as LifecycleStage | undefined,
      source: values.source?.trim() ? values.source.trim() : undefined,
      website: values.website?.trim() ? values.website.trim() : undefined,
      linkedin: values.linkedin?.trim() ? values.linkedin.trim() : undefined,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    };

    await createContact.mutateAsync(clean);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary dark:text-primary">
            Create Contact
          </h1>
          <p className="text-xs text-primary/75 dark:text-white/50">
            Add a new contact to your client workspace.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="pb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-6 p-6 pt-0 rounded-xs border-b border-white/5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                      Contact name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        className=" border-black/10 dark:border-white/5 text-primary text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john@example.com"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Phone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+44 7123 456789"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Company name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Inc."
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Position
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="CEO"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Contact type
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          <SelectItem value={ContactType.LEAD}>Lead</SelectItem>
                          <SelectItem value={ContactType.PROSPECT}>
                            Prospect
                          </SelectItem>
                          <SelectItem value={ContactType.CUSTOMER}>
                            Customer
                          </SelectItem>
                          <SelectItem value={ContactType.CHURN}>
                            Churn
                          </SelectItem>
                          <SelectItem value={ContactType.CLOSED}>
                            Closed
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lifecycleStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Lifecycle stage
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent className="bg-background border-black/10 dark:border-white/5">
                          <SelectItem value={LifecycleStage.SUBSCRIBER}>
                            Subscriber
                          </SelectItem>
                          <SelectItem value={LifecycleStage.LEAD}>
                            Lead
                          </SelectItem>
                          <SelectItem value={LifecycleStage.MQL}>
                            MQL
                          </SelectItem>
                          <SelectItem value={LifecycleStage.SQL}>
                            SQL
                          </SelectItem>
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Score
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        City
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="London"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Country
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="United Kingdom"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        Source
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="LinkedIn"
                          className=" border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                        LinkedIn
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://linkedin.com/in/..."
                          className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-primary/75 dark:text-white/50">
                      Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this contact..."
                        className="bg-background border-black/10 dark:border-white/5 text-primary text-xs"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={createContact.isPending}
                className="bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={createContact.isPending}
                className="bg-background hover:bg-primary-foreground/50 hover:text-black text-xs rounded-lg border border-black/10 dark:border-white/5 transition duration-150"
              >
                {createContact.isPending ? "Creating..." : "Create Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
