"use client";

import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-utils";
import { useTRPC } from "@/trpc/client";
import { caller } from "@/trpc/server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Page = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data } = useQuery(trpc.getWorkflows.queryOptions());

  const create = useMutation(
    trpc.createWorkflow.mutationOptions({
      onSuccess: () => {
        toast.success("Workflow queued.");
      },
    })
  );

  const testAI = useMutation(
    trpc.testAI.mutationOptions({
      onSuccess: ({ message }) => {
        toast.success(`Success: ${message}`);
      },
    })
  );

  return (
    <div className="flex flex-col gap-6">
      Protected server component {JSON.stringify(data)}{" "}
      <div className="flex gap-2">
        <Button disabled={create.isPending} onClick={() => create.mutate()}>
          {" "}
          Create workflow
        </Button>

        <Button disabled={testAI.isPending} onClick={() => testAI.mutate()}>
          {" "}
          Test AI
        </Button>
      </div>
    </div>
  );
};

export default Page;
