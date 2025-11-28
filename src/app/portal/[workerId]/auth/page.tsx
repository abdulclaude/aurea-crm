"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerifyMagicLink } from "@/features/workers/hooks/use-workers";

export default function WorkerAuthPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  const { mutate: verifyMagicLink } = useVerifyMagicLink();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid magic link - no token provided");
      return;
    }

    verifyMagicLink(
      {
        workerId,
        token,
      },
      {
        onSuccess: (data) => {
          setStatus("success");
          // Store worker session in localStorage
          localStorage.setItem(
            "workerSession",
            JSON.stringify({
              workerId: data.workerId,
              name: data.name,
              subaccountId: data.subaccountId,
              authenticatedAt: new Date().toISOString(),
            })
          );

          // Redirect to portal dashboard after 1 second
          setTimeout(() => {
            router.push(`/portal/${workerId}/dashboard`);
          }, 1000);
        },
        onError: (error: any) => {
          setStatus("error");
          setErrorMessage(error.message || "Invalid or expired magic link");
        },
      }
    );
  }, [token, workerId, verifyMagicLink, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Worker Portal</CardTitle>
          <CardDescription>Authenticating your session...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          {status === "verifying" && (
            <div className="flex flex-col items-center gap-4">
              <LoaderCircle className="size-12 animate-spin text-primary" />
              <p className="text-sm text-primary/60">Verifying your magic link...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="size-12 text-green-500" />
              <p className="text-sm text-primary font-medium">Authentication successful!</p>
              <p className="text-xs text-primary/60">Redirecting to your dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="size-12 text-red-500" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                Authentication failed
              </p>
              <p className="text-xs text-primary/60 text-center">{errorMessage}</p>
              <p className="text-xs text-primary/40 mt-4 text-center">
                Please contact your administrator for a new login link.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
