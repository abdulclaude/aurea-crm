import { Button } from "@/components/ui/button";
import { useWorkflowRealtime } from "@/features/editor/store/workflow-realtime-context";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react";
import { useState } from "react";

export const ExecuteWorkflowButton = ({
  workflowId,
}: {
  workflowId: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();
  const { startMonitoring, stopMonitoring } = useWorkflowRealtime();
  const [isPreparing, setIsPreparing] = useState(false);

  const handleExecute = async () => {
    if (isPreparing || executeWorkflow.isPending) return;

    setIsPreparing(true);
    await startMonitoring();
    executeWorkflow.mutate(
      { id: workflowId },
      {
        onError: stopMonitoring,
        onSettled: () => setIsPreparing(false),
      },
    );
  };

  return (
    <Button
      size="lg"
      onClick={() => void handleExecute()}
      disabled={isPreparing || executeWorkflow.isPending}
      className="h-9 w-max gap-2 rounded-lg border border-black/10 bg-background px-4 text-xs text-primary shadow-xs hover:bg-primary-foreground/40 hover:text-primary dark:border-white/10"
    >
      <FlaskConicalIcon className="size-3.5" />
      Execute workflow
    </Button>
  );
};
