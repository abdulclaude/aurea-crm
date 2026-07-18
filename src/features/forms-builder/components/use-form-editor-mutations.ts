"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

export function useFormEditorMutations(formId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [updatingFieldId, setUpdatingFieldId] = React.useState<string | null>(
    null,
  );

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries(
      trpc.forms.get.queryOptions({ id: formId }),
    );
  }

  const updateForm = useMutation(
    trpc.forms.update.mutationOptions({
      onSuccess: async () => {
        await refresh();
        toast.success("Form settings saved");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const addStep = useMutation(
    trpc.forms.addStep.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteStep = useMutation(
    trpc.forms.deleteStep.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    }),
  );
  const addField = useMutation(
    trpc.forms.addField.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateField = useMutation(
    trpc.forms.updateField.mutationOptions({
      onSuccess: async () => {
        await refresh();
        setUpdatingFieldId(null);
        toast.success("Field saved");
      },
      onError: (error) => {
        setUpdatingFieldId(null);
        toast.error(error.message);
      },
    }),
  );
  const reorderFields = useMutation(
    trpc.forms.reorderFields.mutationOptions({
      onSuccess: refresh,
      onError: async (error) => {
        await refresh();
        toast.error(error.message);
      },
    }),
  );
  const deleteField = useMutation(
    trpc.forms.deleteField.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    }),
  );

  return {
    updateForm,
    addStep,
    deleteStep,
    addField,
    updateField,
    reorderFields,
    deleteField,
    updatingFieldId,
    setUpdatingFieldId,
  };
}
