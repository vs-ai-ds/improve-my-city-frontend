// File: src/store/useReportModal.ts
import { create } from "zustand";

type ReportState = {
  isOpen: boolean;
  initialLat?: number;
  initialLng?: number;
  openWith: (p?: { lat?: number; lng?: number }) => void;
  close: () => void;
};

export const useReportModal = create<ReportState>((set) => ({
  isOpen: false,
  initialLat: undefined,
  initialLng: undefined,
  openWith: (p) => set({ isOpen: true, initialLat: p?.lat, initialLng: p?.lng }),
  close: () => set({ isOpen: false }),
}));