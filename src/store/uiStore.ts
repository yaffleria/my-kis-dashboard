import { create } from "zustand";

interface UIState {
  isCockpitModalOpen: boolean;
  openCockpitModal: () => void;
  closeCockpitModal: () => void;
  toggleCockpitModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCockpitModalOpen: false,
  openCockpitModal: () => set({ isCockpitModalOpen: true }),
  closeCockpitModal: () => set({ isCockpitModalOpen: false }),
  toggleCockpitModal: () =>
    set((state) => ({ isCockpitModalOpen: !state.isCockpitModalOpen })),
}));
