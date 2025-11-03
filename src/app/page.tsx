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

  return (
    <div>
      Protected server component {JSON.stringify(data)}{" "}
      <Button disabled={create.isPending} onClick={() => create.mutate()}>
        {" "}
        Create workflow
      </Button>
    </div>
  );
};

export default Page;
