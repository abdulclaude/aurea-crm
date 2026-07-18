"use client";

import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import {
  TagActionDialog,
  type TagActionValues,
} from "@/features/nodes/executions/components/tag-action-dialog";

export type RemoveTagFromClientFormValues = TagActionValues;

export function RemoveTagFromClientDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RemoveTagFromClientFormValues) => void;
  defaultValues?: Partial<RemoveTagFromClientFormValues>;
  variables: VariableItem[];
}): React.ReactElement {
  return <TagActionDialog {...props} action="remove" />;
}
