import { create } from "zustand";

interface Attachment {
  id: string;
  name: string;
  slot: string;
  effects: Record<string, number>;
}

interface Weapon {
  id: string;
  name: string;
  category: string;
  model_url: string | null;
  image_url: string | null;
  base_stats: Record<string, number>;
  slots: string[];
  attachments: Attachment[];
}

interface LoadoutState {
  weapons: Weapon[];
  selectedWeaponId: string | null;
  selectedAttachments: Record<string, string | null>;
  setWeapons: (weapons: Weapon[]) => void;
  selectWeapon: (id: string) => void;
  setAttachment: (slot: string, attachmentId: string | null) => void;
  resetLoadout: () => void;
  getSelectedWeapon: () => Weapon | undefined;
  getCalculatedStats: () => Record<string, number>;
}

export const useLoadoutStore = create<LoadoutState>((set, get) => ({
  weapons: [],
  selectedWeaponId: null,
  selectedAttachments: {},

  setWeapons: (weapons) => set({ weapons }),

  selectWeapon: (id) =>
    set({
      selectedWeaponId: id,
      selectedAttachments: {},
    }),

  setAttachment: (slot, attachmentId) =>
    set((state) => ({
      selectedAttachments: { ...state.selectedAttachments, [slot]: attachmentId },
    })),

  resetLoadout: () => set({ selectedAttachments: {} }),

  getSelectedWeapon: () => {
    const state = get();
    return state.weapons.find((w) => w.id === state.selectedWeaponId);
  },

  getCalculatedStats: () => {
    const state = get();
    const weapon = state.weapons.find((w) => w.id === state.selectedWeaponId);
    if (!weapon) return {};

    const stats = { ...weapon.base_stats };

    Object.entries(state.selectedAttachments).forEach(([slot, attId]) => {
      if (!attId) return;
      const att = weapon.attachments.find((a) => a.id === attId);
      if (!att) return;
      Object.entries(att.effects).forEach(([key, value]) => {
        stats[key] = (stats[key] || 0) + value;
      });
    });

    Object.keys(stats).forEach((key) => {
      stats[key] = Math.max(0, Math.min(100, stats[key]));
    });

    return stats;
  },
}));
