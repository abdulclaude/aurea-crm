"use client";

import { useCallback, useState } from "react";
import { useReactFlow } from "@xyflow/react";

type StudioNodeSettings<T> = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openSettings: () => void;
  save: (values: T) => void;
};

export function useStudioNodeSettings<T extends Record<string, unknown>>(
  nodeId: string,
): StudioNodeSettings<T> {
  const [open, setOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const openSettings = useCallback(() => setOpen(true), []);
  const save = useCallback(
    (values: T) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...values } }
            : node,
        ),
      );
    },
    [nodeId, setNodes],
  );

  return { open, setOpen, openSettings, save };
}
