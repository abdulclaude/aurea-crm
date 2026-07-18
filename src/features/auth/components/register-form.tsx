"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { toast } from "sonner";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getSafeCallbackUrl } from "@/features/auth/lib/callback-url";
import { authClient } from "@/lib/auth-client";

const registerSchema = z
  .object({
    name: z.string().min(1, "Your name is required."),
    email: z.email("Please enter a valid email address."),
    password: z.string().min(1, "A password is required."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [isGooglePending, setIsGooglePending] = useState(false);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    await authClient.signUp.email(
      {
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL: callbackUrl,
      },
      {
        onSuccess: () => {
          router.push(callbackUrl);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
      },
    );
  };

  const onGoogleSignIn = async () => {
    setIsGooglePending(true);
    try {
      await authClient.signIn.social(
        { provider: "google", callbackURL: callbackUrl },
        {
          onError: (ctx) => {
            toast.error(ctx.error.message);
          },
        },
      );
    } finally {
      setIsGooglePending(false);
    }
  };

  const isPending = form.formState.isSubmitting || isGooglePending;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center gap-1">
          <CardTitle>
            <h1>Ready to supercharge your studio?</h1>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel> Full name </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            autoComplete="name"
                            placeholder="John Doe"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel> Email </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="m@example.com"
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel> Password </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            placeholder="******"
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel> Confirm password </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            placeholder="******"
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      variant="success"
                      className="w-full"
                      disabled={isPending}
                    >
                      {" "}
                      Sign up today{" "}
                    </Button>

                    <Button
                      className="w-full"
                      type="button"
                      disabled={isPending}
                      onClick={onGoogleSignIn}
                    >
                      <Image
                        src="/logos/google.svg"
                        height={16}
                        width={16}
                        alt=""
                      />
                      Continue with Google
                    </Button>
                  </div>
                </div>

                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="underline underline-offset-1">
                    Login
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterForm;
