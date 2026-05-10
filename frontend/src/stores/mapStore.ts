import { create } from "zustand";

interface MapState {
  selectedMapId: number | null;
  activeCategories: string[];
  selectedPointId: number | null;
  setSelectedMapId: (id: number) => void;
  toggleCategory: (cat: string) => void;
  setSelectedPointId: (id: number | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedMapId: null,
  activeCategories: ["spawn", "resource", "tactical", "extraction", "danger"],
  selectedPointId: null,
  setSelectedMapId: (id) => set({ selectedMapId: id }),
  toggleCategory: (cat) =>
    set((state) => ({
      activeCategories: state.activeCategories.includes(cat)
        ? state.activeCategories.filter((c) => c !== cat)
        : [...state.activeCategories, cat],
    })),
  setSelectedPointId: (id) => set({ selectedPointId: id }),
}));
