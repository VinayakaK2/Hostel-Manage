import { create } from "zustand";

export type AttendanceMark = "PRESENT" | "ABSENT" | "LEAVE";

export interface AttendanceDraftEntry {
  studentId: string;
  status: AttendanceMark;
  leaveReason?: string;
}

interface WardenAttendanceState {
  selectedDate: string;
  drafts: Record<string, AttendanceDraftEntry>;
  setSelectedDate: (ymd: string) => void;
  setDraft: (studentId: string, entry: AttendanceDraftEntry) => void;
  resetDrafts: () => void;
  hydrateFromServer: (rows: { id: string; attendance: { status: AttendanceMark; leave_reason: string | null } | null }[]) => void;
}

export const useWardenAttendanceStore = create<WardenAttendanceState>((set) => ({
  selectedDate: new Date().toISOString().slice(0, 10),
  drafts: {},
  setSelectedDate: (selectedDate) => set({ selectedDate, drafts: {} }),
  setDraft: (studentId, entry) =>
    set((s) => ({
      drafts: { ...s.drafts, [studentId]: entry },
    })),
  resetDrafts: () => set({ drafts: {} }),
  /**
   * Merges server attendance into drafts. Rows without a server record do NOT remove
   * existing draft keys — otherwise a refetch (or Strict Mode double-mount) wipes
   * in-memory PRESENT/ABSENT/LEAVE picks before Submit.
   */
  hydrateFromServer: (rows) =>
    set((s) => {
      const next = { ...s.drafts };
      for (const r of rows) {
        if (r.attendance) {
          next[r.id] = {
            studentId: r.id,
            status: r.attendance.status,
            leaveReason: r.attendance.leave_reason ?? undefined,
          };
        }
      }
      return { drafts: next };
    }),
}));
