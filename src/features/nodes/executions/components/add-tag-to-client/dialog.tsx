"use client";

import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import {
  TagActionDialog,
  type TagActionValues,
} from "@/features/nodes/executions/components/tag-action-dialog";

export type AddTagToClientFormValues = TagActionValues;

export function AddTagToClientDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddTagToClientFormValues) => void;
  defaultValues?: Partial<AddTagToClientFormValues>;
  variables: VariableItem[];
}): React.ReactElement {
  return <TagActionDialog {...props} action="add" />;
}
