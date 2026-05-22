import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface FloatingAssistantConversationTab {
  id: string;
  title: string;
  updatedAt: number;
}

interface FloatingAssistantState {
  isOpen: boolean;
  initialQuery: string | null;
  initialQueryAction: "draft" | "submit";
  conversationId: string | null;
  newConversationSignal: number;
  conversationSwitchSignal: number;
  conversationTabs: FloatingAssistantConversationTab[];
  activeTabRect: { centerX: number; barTop: number } | null;
  open: (initialQuery?: string, action?: "draft" | "submit") => void;
  close: () => void;
  toggle: () => void;
  setInitialQuery: (query: string | null) => void;
  setConversationId: (id: string | null) => void;
  requestConversationSwitch: (id: string) => void;
  startNewConversation: () => void;
  addConversationTab: (tab: FloatingAssistantConversationTab) => void;
  removeConversationTab: (id: string) => void;
  setActiveTabRect: (rect: { centerX: number; barTop: number } | null) => void;
}

export const useFloatingAssistant = create<FloatingAssistantState>()(
  persist(
    (set) => ({
      isOpen: false,
      initialQuery: null,
      initialQueryAction: "draft",
      conversationId: null,
      newConversationSignal: 0,
      conversationSwitchSignal: 0,
      conversationTabs: [],
      activeTabRect: null,
      open: (initialQuery, action = "draft") =>
        set({
          isOpen: true,
          initialQuery: initialQuery ?? null,
          initialQueryAction: initialQuery ? action : "draft",
        }),
      close: () =>
        set({ isOpen: false, initialQuery: null, initialQueryAction: "draft" }),
      toggle: () =>
        set((state) => ({
          isOpen: !state.isOpen,
          initialQuery: null,
          initialQueryAction: "draft",
        })),
      setInitialQuery: (query, action?: "draft" | "submit") =>
        set({ initialQuery: query, initialQueryAction: query ? (action ?? "draft") : "draft" }),
      setConversationId: (id) => set({ conversationId: id }),
      requestConversationSwitch: (id) =>
        set((state) => ({
          conversationId: id,
          isOpen: true,
          conversationSwitchSignal: state.conversationSwitchSignal + 1,
        })),
      startNewConversation: () =>
        set((state) => ({
          isOpen: true,
          initialQuery: null,
          initialQueryAction: "draft",
          conversationId: null,
          newConversationSignal: state.newConversationSignal + 1,
        })),
      addConversationTab: (tab) =>
        set((state) => ({
          conversationTabs: [
            tab,
            ...state.conversationTabs.filter((t) => t.id !== tab.id),
          ].slice(0, 8),
        })),
      removeConversationTab: (id) =>
        set((state) => {
          const conversationTabs = state.conversationTabs.filter((t) => t.id !== id);
          if (state.conversationId !== id) return { conversationTabs };
          const nextId = conversationTabs[0]?.id ?? null;
          return {
            conversationTabs,
            conversationId: nextId,
            newConversationSignal: nextId
              ? state.newConversationSignal
              : state.newConversationSignal + 1,
          };
        }),
      setActiveTabRect: (rect) => set({ activeTabRect: rect }),
    }),
    {
      name: "aurea:floating-assistant",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversationId: state.conversationId,
        conversationTabs: state.conversationTabs,
      }),
      merge: (persisted, current) => {
        const p =
          persisted && typeof persisted === "object"
            ? (persisted as Partial<FloatingAssistantState>)
            : {};
        const conversationTabs = Array.isArray(p.conversationTabs)
          ? p.conversationTabs
          : [];
        const conversationId =
          typeof p.conversationId === "string" &&
          conversationTabs.some((t) => t.id === p.conversationId)
            ? p.conversationId
            : conversationTabs[0]?.id ?? null;
        return { ...current, conversationId, conversationTabs };
      },
    }
  )
);
