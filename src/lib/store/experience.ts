"use client";

import { create } from "zustand";

interface ExperienceState {
  /** La escena principal está lista para mostrarse. */
  sceneReady: boolean;
  /** El preloader terminó: arrancan las animaciones de entrada. */
  introDone: boolean;
  menuOpen: boolean;
  cartOpen: boolean;
  setSceneReady: () => void;
  setIntroDone: () => void;
  setMenuOpen: (v: boolean) => void;
  setCartOpen: (v: boolean) => void;
}

export const useExperience = create<ExperienceState>((set) => ({
  sceneReady: false,
  introDone: false,
  menuOpen: false,
  cartOpen: false,
  setSceneReady: () => set({ sceneReady: true }),
  setIntroDone: () => set({ introDone: true }),
  setMenuOpen: (menuOpen) => set({ menuOpen, cartOpen: false }),
  setCartOpen: (cartOpen) => set({ cartOpen, menuOpen: false }),
}));
