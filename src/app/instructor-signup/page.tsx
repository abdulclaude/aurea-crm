"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LoaderCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTRPC } from "@/trpc/client";

const signupSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trpc = useTRPC();
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");
  const instructorId = searchParams.get("id");

  const completeSignup = useMutation(
    trpc.instructors.completeSignup.mutationOptions({}),
  );

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token || !instructorId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary">Invalid Link</h1>
          <p className="text-primary/60">
            This signup link is invalid or has expired. Please ask your studio
            admin to send a new invite.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto size-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-primary">Account created</h1>
            <p className="text-primary/60 text-sm">
              Your instructor account has been set up. <br /> You can now log in
              to access your dashboard.
            </p>
          </div>
          <Button
            variant="gradient"
            className="w-max"
            onClick={() => router.push("/login")}
          >
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = (data: SignupFormData) => {
    completeSignup.mutate(
      {
        token,
        instructorId,
        password: data.password,
      },
      {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create account");
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-0.5">
          <div className="mx-auto size-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">A</span>
          </div>

          <h1 className="text-2xl font-bold text-primary">
            Set up your account
          </h1>
          <p className="text-primary/60 text-sm">
            Create a password to access your instructor dashboard
          </p>
        </div>

        <div className="bg-white dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5 p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimum 8 characters"
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
                    <FormLabel>Confirm your password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Re-enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={completeSignup.isPending}
              >
                {completeSignup.isPending && (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                )}
                Create Account
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function InstructorSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-primary/50" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
