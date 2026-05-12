import { create } from "zustand";
import type { z } from "zod";
import {
  blueprintDisplayStatusSchema,
  blueprintOverviewSchema,
  blueprintRoomDetailSchema,
  type BlueprintFloorPayload,
} from "@/modules/warden/api/schemas";

export type BlueprintDisplayStatus = z.infer<typeof blueprintDisplayStatusSchema>;
export type BlueprintOverview = z.infer<typeof blueprintOverviewSchema>;
export type { BlueprintFloorPayload };
export type BlueprintRoomDetail = z.infer<typeof blueprintRoomDetailSchema>;

type LoadState = "idle" | "loading" | "loaded" | "error";

interface WardenBlueprintState {
  /** Bumped when future socket layer pushes occupancy updates (no-op consumer today). */
  blueprintRevision: number;
  overview: BlueprintOverview | null;
  overviewState: LoadState;
  floorPayload: BlueprintFloorPayload | null;
  floorState: LoadState;
  selectedFloor: number;
  error: string | null;
  searchQuery: string;
  /** Empty set = no filter (show all). */
  statusFilters: Set<BlueprintDisplayStatus>;
  detailOpen: boolean;
  detailLoading: boolean;
  roomDetail: BlueprintRoomDetail | null;
  setSelectedFloor: (floor: number) => void;
  setSearchQuery: (q: string) => void;
  toggleStatusFilter: (status: BlueprintDisplayStatus) => void;
  clearStatusFilters: () => void;
  setOverview: (overview: BlueprintOverview | null) => void;
  setOverviewState: (s: LoadState) => void;
  setFloorPayload: (payload: BlueprintFloorPayload | null) => void;
  setFloorState: (s: LoadState) => void;
  setError: (message: string | null) => void;
  openDetail: () => void;
  closeDetail: () => void;
  setRoomDetail: (detail: BlueprintRoomDetail | null) => void;
  setDetailLoading: (v: boolean) => void;
  bumpBlueprintRevision: () => void;
  resetUi: () => void;
}

const initialFilters = new Set<BlueprintDisplayStatus>();

export const useWardenBlueprintStore = create<WardenBlueprintState>((set) => ({
  blueprintRevision: 0,
  overview: null,
  overviewState: "idle",
  floorPayload: null,
  floorState: "idle",
  selectedFloor: 1,
  error: null,
  searchQuery: "",
  statusFilters: initialFilters,
  detailOpen: false,
  detailLoading: false,
  roomDetail: null,

  setSelectedFloor: (selectedFloor) => set({ selectedFloor }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleStatusFilter: (status) =>
    set((s) => {
      const next = new Set(s.statusFilters);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { statusFilters: next };
    }),
  clearStatusFilters: () => set({ statusFilters: new Set() }),
  setOverview: (overview) => set({ overview }),
  setOverviewState: (overviewState) => set({ overviewState }),
  setFloorPayload: (floorPayload) => set({ floorPayload }),
  setFloorState: (floorState) => set({ floorState }),
  setError: (error) => set({ error }),
  openDetail: () => set({ detailOpen: true }),
  closeDetail: () => set({ detailOpen: false, roomDetail: null }),
  setRoomDetail: (roomDetail) => set({ roomDetail }),
  setDetailLoading: (detailLoading) => set({ detailLoading }),
  bumpBlueprintRevision: () => set((s) => ({ blueprintRevision: s.blueprintRevision + 1 })),
  resetUi: () =>
    set({
      searchQuery: "",
      statusFilters: new Set(),
      detailOpen: false,
      roomDetail: null,
    }),
}));
