"use client";

import { useEffect, useRef } from "react";
import type { Edge, Node } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";

import { useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";
import {
  clearWorkflowDraft,
  createWorkflowGraphSnapshot,
  fingerprintWorkflowGraph,
  writeWorkflowDraft,
  type WorkflowGraphSnapshot,
} from "../lib/workflow-editor-draft";
import {
  editorSaveRequestAtom,
  editorSaveStateAtom,
} from "../store/atoms";

const AUTOSAVE_DELAY_MS = 7_000;

type WorkflowAutosaveProps = {
  workflowId: string;
  baseUpdatedAt: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  nodes: Node[];
  edges: Edge[];
};

export function WorkflowAutosave({
  workflowId,
  baseUpdatedAt,
  initialNodes,
  initialEdges,
  nodes,
  edges,
}: WorkflowAutosaveProps) {
  const updateWorkflow = useUpdateWorkflow({ silent: true });
  const saveRequest = useAtomValue(editorSaveRequestAtom);
  const setSaveState = useSetAtom(editorSaveStateAtom);
  const savedFingerprintRef = useRef(
    fingerprintWorkflowGraph(
      createWorkflowGraphSnapshot(initialNodes, initialEdges),
    ),
  );
  const baseUpdatedAtRef = useRef(baseUpdatedAt);
  const currentSnapshotRef = useRef(
    createWorkflowGraphSnapshot(nodes, edges),
  );
  const currentFingerprintRef = useRef(
    fingerprintWorkflowGraph(currentSnapshotRef.current),
  );
  const saveInProgressRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const hasReceivedSaveRequestRef = useRef(false);

  const save = async (snapshot: WorkflowGraphSnapshot): Promise<void> => {
    const fingerprint = fingerprintWorkflowGraph(snapshot);
    if (fingerprint === savedFingerprintRef.current) return;
    if (saveInProgressRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    saveInProgressRef.current = true;
    setSaveState({ workflowId, isDirty: true, isSaving: true, saveFailed: false });

    try {
      const savedWorkflow = await updateWorkflow.mutateAsync({
        id: workflowId,
        nodes: snapshot.nodes,
        edges: snapshot.edges,
      });
      savedFingerprintRef.current = fingerprint;
      baseUpdatedAtRef.current = savedWorkflow.updatedAt.toISOString();

      const isDirty = currentFingerprintRef.current !== fingerprint;
      if (isDirty) {
        writeWorkflowDraft(
          workflowId,
          baseUpdatedAtRef.current,
          currentSnapshotRef.current,
        );
      } else {
        clearWorkflowDraft(workflowId);
      }
      setSaveState({
        workflowId,
        isDirty,
        isSaving: false,
        saveFailed: false,
      });
    } catch {
      setSaveState({
        workflowId,
        isDirty: true,
        isSaving: false,
        saveFailed: true,
      });
    } finally {
      saveInProgressRef.current = false;
      if (queuedSaveRef.current) {
        queuedSaveRef.current = false;
        void save(currentSnapshotRef.current);
      }
    }
  };

  useEffect(() => {
    if (baseUpdatedAtRef.current === baseUpdatedAt) return;
    baseUpdatedAtRef.current = baseUpdatedAt;
    if (currentFingerprintRef.current !== savedFingerprintRef.current) {
      writeWorkflowDraft(
        workflowId,
        baseUpdatedAtRef.current,
        currentSnapshotRef.current,
      );
    }
  }, [baseUpdatedAt, workflowId]);

  useEffect(() => {
    const snapshot = createWorkflowGraphSnapshot(nodes, edges);
    const fingerprint = fingerprintWorkflowGraph(snapshot);
    currentSnapshotRef.current = snapshot;
    currentFingerprintRef.current = fingerprint;
    const isDirty = fingerprint !== savedFingerprintRef.current;

    setSaveState((state) => ({
      workflowId,
      isDirty,
      isSaving: state.workflowId === workflowId && state.isSaving,
      saveFailed: false,
    }));

    if (!isDirty) {
      clearWorkflowDraft(workflowId);
      return;
    }

    writeWorkflowDraft(workflowId, baseUpdatedAtRef.current, snapshot);
    const timeout = window.setTimeout(() => void save(snapshot), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [edges, nodes, setSaveState, workflowId]);

  useEffect(() => {
    if (!hasReceivedSaveRequestRef.current) {
      hasReceivedSaveRequestRef.current = true;
      return;
    }
    void save(currentSnapshotRef.current);
  }, [saveRequest]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (currentFingerprintRef.current === savedFingerprintRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      setSaveState((state) =>
        state.workflowId === workflowId
          ? {
              workflowId: null,
              isDirty: false,
              isSaving: false,
              saveFailed: false,
            }
          : state,
      );
    };
  }, [setSaveState, workflowId]);

  return null;
}
