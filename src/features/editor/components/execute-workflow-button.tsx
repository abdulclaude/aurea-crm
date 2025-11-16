import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react";

export const ExecuteWorkflowButton = ({
  workflowId,
}: {
  workflowId: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();

  return (
    <Button
      size="lg"
      onClick={() => executeWorkflow.mutate({ id: workflowId })}
      disabled={executeWorkflow.isPending}
      className="bg-[#202e32] gap-2 text-xs hover:bg-[#202e32] hover:text-white hover:brightness-110"
    >
      <FlaskConicalIcon className="size-3.5" />
      Execute workflow
    </Button>
  );
};
