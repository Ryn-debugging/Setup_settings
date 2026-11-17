'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BuildSelections,
  ComponentCategory,
  PCComponent,
  SavedBuildItemRecord,
  TargetResolution,
} from '@/types/pc';

export const EMPTY_SELECTIONS: BuildSelections = {
  CPU: null,
  Motherboard: null,
  RAM: null,
  GPU: null,
  Storage: [],
  PSU: null,
  Case: null,
  Cooler: null,
};

interface BuilderState {
  buildTitle: string;
  targetResolution: TargetResolution;
  smartFilterEnabled: boolean;
  selections: BuildSelections;

  setBuildTitle: (title: string) => void;
  setTargetResolution: (resolution: TargetResolution) => void;
  setSmartFilterEnabled: (enabled: boolean) => void;
  selectComponent: (component: PCComponent, storageSlotIndex?: number) => void;
  removeComponent: (category: ComponentCategory, storageSlotIndex?: number) => void;
  updateQuantity: (
    category: ComponentCategory,
    quantity: number,
    storageSlotIndex?: number
  ) => void;
  loadSelections: (
    selections: BuildSelections,
    title?: string,
    resolution?: TargetResolution
  ) => void;
  loadFromSavedItems: (
    items: SavedBuildItemRecord[],
    catalog: PCComponent[],
    title?: string,
    resolution?: TargetResolution
  ) => void;
  clearBuild: () => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      buildTitle: 'Rakitan PC Kustom Saya',
      targetResolution: '1080p Gaming',
      smartFilterEnabled: true,
      selections: { ...EMPTY_SELECTIONS, Storage: [] },

      setBuildTitle: (buildTitle) => set({ buildTitle }),

      setTargetResolution: (targetResolution) => set({ targetResolution }),

      setSmartFilterEnabled: (smartFilterEnabled) => set({ smartFilterEnabled }),

      selectComponent: (component, storageSlotIndex) =>
        set((state) => {
          const next = { ...state.selections };
          if (component.category === 'Storage') {
            const storages = [...next.Storage];
            if (
              storageSlotIndex !== undefined &&
              storageSlotIndex >= 0 &&
              storageSlotIndex < storages.length
            ) {
              storages[storageSlotIndex] = { component, quantity: 1 };
            } else {
              const existingIdx = storages.findIndex((s) => s.component.id === component.id);
              if (existingIdx !== -1) {
                storages[existingIdx] = {
                  ...storages[existingIdx],
                  quantity: Math.min(4, storages[existingIdx].quantity + 1),
                };
              } else {
                storages.push({ component, quantity: 1 });
              }
            }
            next.Storage = storages;
          } else {
            next[component.category] = { component, quantity: 1 };
          }
          return { selections: next };
        }),

      removeComponent: (category, storageSlotIndex) =>
        set((state) => {
          const next = { ...state.selections };
          if (category === 'Storage') {
            if (storageSlotIndex !== undefined) {
              next.Storage = next.Storage.filter((_, idx) => idx !== storageSlotIndex);
            } else {
              next.Storage = [];
            }
          } else {
            next[category] = null;
          }
          return { selections: next };
        }),

      updateQuantity: (category, quantity, storageSlotIndex) =>
        set((state) => {
          const clamped = Math.max(1, Math.min(4, quantity));
          const next = { ...state.selections };
          if (category === 'Storage') {
            if (storageSlotIndex !== undefined && next.Storage[storageSlotIndex]) {
              const storages = [...next.Storage];
              storages[storageSlotIndex] = {
                ...storages[storageSlotIndex],
                quantity: clamped,
              };
              next.Storage = storages;
            }
          } else {
            const current = next[category];
            if (current) {
              next[category] = { ...current, quantity: clamped };
            }
          }
          return { selections: next };
        }),

      loadSelections: (selections, title, resolution) =>
        set((state) => ({
          selections: {
            ...EMPTY_SELECTIONS,
            ...selections,
            Storage: [...(selections.Storage || [])],
          },
          buildTitle: title ?? state.buildTitle,
          targetResolution: resolution ?? state.targetResolution,
        })),

      loadFromSavedItems: (items, catalog, title, resolution) =>
        set((state) => {
          const next: BuildSelections = {
            CPU: null,
            Motherboard: null,
            RAM: null,
            GPU: null,
            Storage: [],
            PSU: null,
            Case: null,
            Cooler: null,
          };

          for (const item of items) {
            const comp =
              item.component || catalog.find((c) => c.id === item.component_id);
            if (!comp) continue;
            if (comp.category === 'Storage') {
              next.Storage.push({ component: comp, quantity: item.quantity || 1 });
            } else {
              next[comp.category] = { component: comp, quantity: item.quantity || 1 };
            }
          }

          return {
            selections: next,
            buildTitle: title ?? state.buildTitle,
            targetResolution: resolution ?? state.targetResolution,
          };
        }),

      clearBuild: () =>
        set({
          selections: { ...EMPTY_SELECTIONS, Storage: [] },
          buildTitle: 'Rakitan PC Kustom Saya',
        }),
    }),
    {
      name: 'rakitpc-builder-storage-v1',
    }
  )
);

/**
 * URL Search Params Synchronization Helpers
 * Format: cpu:id,mobo:id,ram:id*qty,gpu:id,st:id*qty+id*qty,psu:id,case:id,cooler:id
 */
export function serializeSelectionsToParam(selections: BuildSelections): string {
  const parts: string[] = [];
  if (selections.CPU) parts.push(`CPU:${selections.CPU.component.id}`);
  if (selections.Motherboard)
    parts.push(`Motherboard:${selections.Motherboard.component.id}`);
  if (selections.RAM)
    parts.push(`RAM:${selections.RAM.component.id}*${selections.RAM.quantity}`);
  if (selections.GPU) parts.push(`GPU:${selections.GPU.component.id}`);
  if (selections.Storage.length > 0) {
    const stStr = selections.Storage.map(
      (s) => `${s.component.id}*${s.quantity}`
    ).join('+');
    parts.push(`Storage:${stStr}`);
  }
  if (selections.PSU) parts.push(`PSU:${selections.PSU.component.id}`);
  if (selections.Case) parts.push(`Case:${selections.Case.component.id}`);
  if (selections.Cooler) parts.push(`Cooler:${selections.Cooler.component.id}`);
  return parts.join(';');
}

export function deserializeSelectionsFromParam(
  param: string,
  catalog: PCComponent[]
): BuildSelections | null {
  if (!param || !param.trim()) return null;
  const next: BuildSelections = {
    CPU: null,
    Motherboard: null,
    RAM: null,
    GPU: null,
    Storage: [],
    PSU: null,
    Case: null,
    Cooler: null,
  };

  let foundAny = false;
  const entries = param.split(';');
  for (const entry of entries) {
    const [cat, val] = entry.split(':');
    if (!cat || !val) continue;

    if (cat === 'Storage') {
      const stParts = val.split('+');
      for (const sp of stParts) {
        const [id, qtyStr] = sp.split('*');
        const comp = catalog.find((c) => c.id === id);
        if (comp) {
          next.Storage.push({
            component: comp,
            quantity: Math.max(1, Number(qtyStr || 1)),
          });
          foundAny = true;
        }
      }
    } else if (
      cat === 'CPU' ||
      cat === 'Motherboard' ||
      cat === 'RAM' ||
      cat === 'GPU' ||
      cat === 'PSU' ||
      cat === 'Case' ||
      cat === 'Cooler'
    ) {
      const [id, qtyStr] = val.split('*');
      const comp = catalog.find((c) => c.id === id);
      if (comp) {
        next[cat] = {
          component: comp,
          quantity: Math.max(1, Number(qtyStr || 1)),
        };
        foundAny = true;
      }
    }
  }

  return foundAny ? next : null;
}
