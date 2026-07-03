"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { DashboardProviders } from "@/components/layout/dashboard-providers";
import { PageTransition } from "@/components/effects/page-transition";
import { KeyboardShortcutHints, useKeyboardNavigation } from "@/components/effects/keyboard-shortcuts";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  useKeyboardNavigation(showShortcuts, setShowShortcuts);

  return (
    <DashboardProviders>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="pl-[var(--sidebar-width,240px)] transition-all duration-300">
          <Topbar />
          <main className="p-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
      <KeyboardShortcutHints visible={showShortcuts} />
    </DashboardProviders>
  );
}
