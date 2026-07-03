"use client";

import { type ReactNode } from "react";
import { CyberBackground } from "./cyber-background";
import { CursorSpotlight } from "./cursor-spotlight";
import { CommandPalette } from "../ui/command-palette";

interface EffectsProviderProps {
  children: ReactNode;
  showBackground?: boolean;
  showSpotlight?: boolean;
  showCommandPalette?: boolean;
}

export function EffectsProvider({
  children,
  showBackground = true,
  showSpotlight = true,
  showCommandPalette = true,
}: EffectsProviderProps) {
  return (
    <>
      {showBackground && <CyberBackground />}
      {showSpotlight && <CursorSpotlight />}
      {showCommandPalette && <CommandPalette />}
      {children}
    </>
  );
}
