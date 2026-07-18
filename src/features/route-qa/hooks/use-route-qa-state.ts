"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  parseRouteQaCompleted,
  parseRouteQaNotes,
  readRouteQaStorage,
  ROUTE_QA_COMPLETED_STORAGE_KEY,
  ROUTE_QA_NOTES_STORAGE_KEY,
  serializeRouteQaNotes,
  writeRouteQaStorage,
} from "@/features/route-qa/lib/route-qa-storage";

type RouteQaState = {
  completedIds: ReadonlySet<string>;
  notesById: Readonly<Record<string, string>>;
  storageError: boolean;
  toggleItem: (id: string) => void;
  toggleSection: (ids: string[], completed: boolean) => void;
  updateNote: (id: string, value: string) => void;
  resetProgress: () => void;
};

export function useRouteQaState(): RouteQaState {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const notesByIdRef = useRef<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    setCompletedIds(
      new Set(
        parseRouteQaCompleted(
          readRouteQaStorage(
            window.localStorage,
            ROUTE_QA_COMPLETED_STORAGE_KEY,
          ),
        ),
      ),
    );
    const storedNotes = parseRouteQaNotes(
      readRouteQaStorage(window.localStorage, ROUTE_QA_NOTES_STORAGE_KEY),
    );
    notesByIdRef.current = storedNotes;
    setNotesById(storedNotes);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const saved = writeRouteQaStorage(
      window.localStorage,
      ROUTE_QA_COMPLETED_STORAGE_KEY,
      JSON.stringify([...completedIds]),
    );
    setStorageError((current) => current || !saved);
  }, [completedIds, hydrated]);

  const toggleItem = useCallback((id: string): void => {
    setCompletedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSection = useCallback(
    (ids: string[], completed: boolean): void => {
      setCompletedIds((current) => {
        const next = new Set(current);
        for (const id of ids) {
          if (completed) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [],
  );

  const updateNote = useCallback((id: string, value: string): void => {
    const next = { ...notesByIdRef.current };
    if (value.trim().length === 0) delete next[id];
    else next[id] = value;
    notesByIdRef.current = next;
    setNotesById(next);
    const saved = writeRouteQaStorage(
      window.localStorage,
      ROUTE_QA_NOTES_STORAGE_KEY,
      serializeRouteQaNotes(next),
    );
    setStorageError((current) => current || !saved);
  }, []);

  const resetProgress = useCallback((): void => {
    setCompletedIds(new Set());
  }, []);

  return {
    completedIds,
    notesById,
    storageError,
    toggleItem,
    toggleSection,
    updateNote,
    resetProgress,
  };
}
