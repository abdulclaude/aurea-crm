"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconCircleCheck as CheckIcon } from "central-icons/IconCircleCheck";
import { IconCrossMedium as XIcon } from "central-icons/IconCrossMedium";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { Separator } from "@/components/ui/separator";

const { useSession } = authClient;

function InvitationPageContent() {
  const params = useParams();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const autoAcceptAttempted = useRef(false);

  const invitationId = params.id as string;

  // Fetch invitation data regardless of auth status
  const {
    data: invitation,
    error: fetchError,
    isLoading,
  } = useQuery({
    ...trpc.organizations.getInvitation.queryOptions({ invitationId }),
    enabled: !isSessionPending && !success,
  });

  const acceptMutation = useMutation({
    ...trpc.organizations.acceptInvitation.mutationOptions(),
    onSuccess: () => {
      // Invalidate invitations list to refresh on the invites page
      queryClient.invalidateQueries({
        queryKey: [["organizations", "listInvitations"]],
      });
    },
  });

  const handleAccept = useCallback(async () => {
    // If not authenticated, redirect to sign-up with return URL
    if (!session?.user) {
      router.push(`/sign-up?callbackUrl=/invitation/${invitationId}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      await acceptMutation.mutateAsync({ invitationId });

      setSuccess(true);
      setAccepting(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to accept invitation");
      setAccepting(false);
    }
  }, [session, router, invitationId, acceptMutation]);

  // Auto-accept invitation when user returns from sign-up/login
  useEffect(() => {
    if (
      !autoAcceptAttempted.current &&
      session?.user &&
      invitation &&
      invitation.status === "pending" &&
      session.user.email === invitation.email
    ) {
      autoAcceptAttempted.current = true;
      handleAccept();
    }
  }, [session, invitation, handleAccept]);

  // Redirect to dashboard after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [success, router]);

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl ring ring-green-400/80 bg-white p-8 text-center shadow-xl">
          <CheckIcon className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Invitation accepted!
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You've successfully joined{" "}
            {invitation?.subaccount
              ? invitation.subaccount.companyName
              : invitation?.organization.name}
            .
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            Redirecting you now...
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <LoaderIcon className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-primary/75">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl ring ring-rose-400/80 bg-white p-8 text-center shadow-xl">
          <XIcon className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Invalid invitation
          </h1>
          <p className="mt-2 text-sm text-primary/75 dark:text-gray-400">
            {fetchError.message ||
              "This invitation link is invalid or has expired."}
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="mt-6"
            variant="outline"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If invitation data hasn't loaded yet, return null or loading
  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <LoaderIcon className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading invitation...
          </p>
        </div>
      </div>
    );
  }

  const entityName = invitation.subaccount
    ? `${invitation.subaccount.companyName} (${invitation.organization.name})`
    : invitation.organization.name;

  const entityLogo =
    invitation.subaccount?.logo || invitation.organization.logo;

  return (
    <div className="flex h-svh items-center justify-center bg-background">
      <div className="w-full min-w-xl rounded-lg border border-black/10 bg-white shadow-xl">
        {/* Organization/Subaccount Logo */}
        {/* {entityLogo && (
          <div className="mx-auto mb-6 flex size-20 items-center justify-center">
            <Avatar className="h-16 w-16">
              <AvatarImage src={entityLogo} alt={entityName} />
              <AvatarFallback className="bg-[#202e32] text-white">
                {entityName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        )} */}

        {/* Invitation Details */}
        <div className="flex flex-col items-center gap-2 p-8 py-6 pb-5">
          {invitation.subaccount && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Client Workspace
            </p>
          )}

          <p className="text-base text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">
              {invitation.inviter.name}
            </span>{" "}
            has invited you to join
          </p>

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center">
              <Avatar className="size-5 text-xs">
                <AvatarImage src={entityLogo ?? undefined} alt={entityName} />
                <AvatarFallback className="bg-[#202e32] text-white">
                  {entityName[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {entityName}
            </p>
          </div>
        </div>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <div className="">
          <div className="p-8 py-6">
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Invited Email
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {invitation.email}
            </p>
          </div>

          {!session?.user && (
            <Separator className="bg-black/10 dark:bg-white/5" />
          )}

          {session?.user && session.user.email !== invitation.email && (
            <div className="border-y border-amber-200 bg-amber-50 p-8 py-6 dark:border-yellow-900 dark:bg-yellow-900/20">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Warning: You're signed in as{" "}
                <strong>{session.user.email}</strong>, but this invitation is
                for <strong>{invitation.email}</strong>.
              </p>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Please sign in with the correct email address to accept this
                invitation.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-8 py-6 w-full justify-between items-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This invitation expires on{" "}
            {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/login")}
              disabled={accepting}
              className="w-max h-8"
            >
              Decline
            </Button>

            <Button
              onClick={handleAccept}
              disabled={
                accepting ||
                (session?.user && session.user.email !== invitation.email)
              }
              variant="gradient"
              className="w-max h-8 font-medium"
            >
              {accepting ? (
                <>
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : !session?.user ? (
                "Sign up to accept"
              ) : (
                "Accept invitation"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvitationPage() {
  return <InvitationPageContent />;
}
