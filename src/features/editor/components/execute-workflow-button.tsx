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
      className="h-9 w-max gap-2 rounded-lg border border-black/10 bg-background px-4 text-xs text-primary shadow-sm hover:bg-primary-foreground/40 hover:text-primary dark:border-white/10"
    >
      <FlaskConicalIcon className="size-3.5" />
      Execute workflow
    </Button>
  );
};
