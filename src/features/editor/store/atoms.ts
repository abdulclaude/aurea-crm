import type { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";

export const editorAtom = atom<ReactFlowInstance | null>(null);

export type EditorSaveState = {
  workflowId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  saveFailed: boolean;
};

export const editorSaveStateAtom = atom<EditorSaveState>({
  workflowId: null,
  isDirty: false,
  isSaving: false,
  saveFailed: false,
});

export const editorSaveRequestAtom = atom(0);
