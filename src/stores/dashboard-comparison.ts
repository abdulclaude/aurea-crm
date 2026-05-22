import { create } from "zustand";

export type WidgetComparisonMode = "none" | "previous";

type ComparisonState = {
  comparisons: Record<string, WidgetComparisonMode>;
  setComparison: (owner: string, mode: WidgetComparisonMode) => void;
  reset: () => void;
};

export const useDashboardComparison = create<ComparisonState>((set) => ({
  comparisons: {},
  setComparison: (owner, mode) =>
    set((prev) => ({ comparisons: { ...prev.comparisons, [owner]: mode } })),
  reset: () => set({ comparisons: {} }),
}));
