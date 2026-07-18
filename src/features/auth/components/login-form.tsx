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

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "A password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [isGooglePending, setIsGooglePending] = useState(false);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
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
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>
            <h1>Log in</h1>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-6">
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
                            autoComplete="current-password"
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
                      Log in{" "}
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
                  Don't have an account?{" "}
                  <Link
                    href="/sign-up"
                    className="underline underline-offset-1"
                  >
                    Sign up
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

export default LoginForm;
