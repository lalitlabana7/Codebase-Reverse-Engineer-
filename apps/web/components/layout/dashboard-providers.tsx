"use client";

import type { ReactNode } from "react";
import { ScanProgressOverlay } from "./scan-progress-overlay";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ScanProgressOverlay />
    </>
  );
}
