/**
 * Signal Navigation State Management
 *
 * Manages hierarchical navigation through signals → sightings → details
 */

import { create } from "zustand";

export interface SignalNavigationState {
  selectedSignal: string | null;
  selectedSighting: string | null;
  sidebars: {
    level: 1 | 2 | 3;
    isOpen: boolean;
    width: number;
  }[];
  history: NavigationHistoryEntry[];
  navigateToSignal: (signalId: string) => void;
  navigateToSighting: (sightingId: string) => void;
  navigateBack: () => void;
  clearNavigation: () => void;
  toggleSidebar: (level: 1 | 2 | 3) => void;
  syncWithUrl: () => void;
}

export interface NavigationHistoryEntry {
  type: "signal" | "sighting";
  id: string;
  timestamp: Date;
}

const DEFAULT_SIDEBAR_WIDTHS = {
  1: 320,
  2: 400,
  3: 480,
};

export const useSignalNavigation = create<SignalNavigationState>(
  (set, get) => ({
    selectedSignal: null,
    selectedSighting: null,
    sidebars: [
      { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
      { level: 2, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[2] },
      { level: 3, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[3] },
    ],
    history: [],

    navigateToSignal: (signalId: string) => {
      const state = get();
      const history =
        state.selectedSignal !== signalId
          ? [
              ...state.history,
              { type: "signal" as const, id: signalId, timestamp: new Date() },
            ]
          : state.history;

      set({
        selectedSignal: signalId,
        selectedSighting: null,
        sidebars: [
          { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
          { level: 2, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[2] },
          { level: 3, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[3] },
        ],
        history,
      });
    },

    navigateToSighting: (sightingId: string) => {
      const state = get();
      const history = [
        ...state.history,
        {
          type: "sighting" as const,
          id: sightingId,
          timestamp: new Date(),
        },
      ];

      set({
        selectedSighting: sightingId,
        sidebars: [
          { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
          { level: 2, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[2] },
          { level: 3, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[3] },
        ],
        history,
      });
    },

    navigateBack: () => {
      const state = get();
      if (state.selectedSighting) {
        set({
          selectedSighting: null,
          sidebars: [
            { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
            { level: 2, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[2] },
            { level: 3, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[3] },
          ],
        });
      } else if (state.selectedSignal) {
        set({
          selectedSignal: null,
          sidebars: [
            { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
            { level: 2, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[2] },
            { level: 3, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[3] },
          ],
        });
      }
    },

    clearNavigation: () => {
      set({
        selectedSignal: null,
        selectedSighting: null,
        sidebars: [
          { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
          { level: 2, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[2] },
          { level: 3, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[3] },
        ],
        history: [],
      });
    },

    toggleSidebar: (level: 1 | 2 | 3) => {
      const state = get();
      const newSidebars = state.sidebars.map((sidebar) =>
        sidebar.level === level
          ? { ...sidebar, isOpen: !sidebar.isOpen }
          : sidebar
      );
      set({ sidebars: newSidebars });
    },

    syncWithUrl: () => {
      // Parse URL query params on client side only
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const signalId = params.get("signal");
      const sightingId = params.get("sighting");

      if (sightingId && signalId) {
        set({
          selectedSignal: signalId,
          selectedSighting: sightingId,
          sidebars: [
            { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
            { level: 2, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[2] },
            { level: 3, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[3] },
          ],
        });
      } else if (signalId) {
        set({
          selectedSignal: signalId,
          selectedSighting: null,
          sidebars: [
            { level: 1, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[1] },
            { level: 2, isOpen: true, width: DEFAULT_SIDEBAR_WIDTHS[2] },
            { level: 3, isOpen: false, width: DEFAULT_SIDEBAR_WIDTHS[3] },
          ],
        });
      }
    },
  })
);
