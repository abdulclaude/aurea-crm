"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";

export const DEFAULT_SIDEBAR_WIDTH = 272;
export const MIN_SIDEBAR_WIDTH = 240;
export const MAX_SIDEBAR_WIDTH = 352;

const STORAGE_KEY = "aurea:sidebar-preferences";
const sidebarPreferencesSchema = z.object({
  width: z.number().int().min(MIN_SIDEBAR_WIDTH).max(MAX_SIDEBAR_WIDTH),
  hiddenGroups: z.array(z.string()),
  hiddenItems: z.array(z.string()),
});

type SidebarPreferences = z.infer<typeof sidebarPreferencesSchema>;

type SidebarPreferencesContextValue = SidebarPreferences & {
  isResizing: boolean;
  setWidth: (width: number) => void;
  setIsResizing: (isResizing: boolean) => void;
  isGroupVisible: (groupId: string) => boolean;
  isItemVisible: (itemId: string) => boolean;
  setGroupVisible: (groupId: string, visible: boolean) => void;
  setItemVisible: (itemId: string, visible: boolean) => void;
  resetPreferences: () => void;
};

const defaultPreferences: SidebarPreferences = {
  width: DEFAULT_SIDEBAR_WIDTH,
  hiddenGroups: [],
  hiddenItems: [],
};

const SidebarPreferencesContext = createContext<
  SidebarPreferencesContextValue | undefined
>(undefined);

function toggleHidden(
  hidden: string[],
  id: string,
  visible: boolean,
): string[] {
  if (visible) return hidden.filter((value) => value !== id);
  return hidden.includes(id) ? hidden : [...hidden, id];
}

export function SidebarPreferencesProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [preferences, setPreferences] =
    useState<SidebarPreferences>(defaultPreferences);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        const result = sidebarPreferencesSchema.safeParse(parsed);
        if (result.success) setPreferences(result.data);
      }
    } catch {
      setPreferences(defaultPreferences);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch {
        // Preferences remain available for the current session.
      }
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [isHydrated, preferences]);

  const setWidth = (width: number): void => {
    setPreferences((current) => ({
      ...current,
      width: Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width)),
    }));
  };

  return (
    <SidebarPreferencesContext.Provider
      value={{
        ...preferences,
        isResizing,
        setWidth,
        setIsResizing,
        isGroupVisible: (groupId) =>
          !preferences.hiddenGroups.includes(groupId),
        isItemVisible: (itemId) => !preferences.hiddenItems.includes(itemId),
        setGroupVisible: (groupId, visible) =>
          setPreferences((current) => ({
            ...current,
            hiddenGroups: toggleHidden(
              current.hiddenGroups,
              groupId,
              visible,
            ),
          })),
        setItemVisible: (itemId, visible) =>
          setPreferences((current) => ({
            ...current,
            hiddenItems: toggleHidden(current.hiddenItems, itemId, visible),
          })),
        resetPreferences: () => setPreferences(defaultPreferences),
      }}
    >
      {children}
    </SidebarPreferencesContext.Provider>
  );
}

export function useSidebarPreferences(): SidebarPreferencesContextValue {
  const context = useContext(SidebarPreferencesContext);
  if (!context) {
    throw new Error(
      "useSidebarPreferences must be used within SidebarPreferencesProvider",
    );
  }
  return context;
}
