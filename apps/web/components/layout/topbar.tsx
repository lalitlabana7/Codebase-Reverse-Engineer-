"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Bell, Zap } from "lucide-react";
import { SocStatusBar } from "./soc-status-bar";

export function Topbar() {
  const { user } = useUser();

  return (
    <header
      className="h-11 flex items-center justify-between px-4 bg-background/95 border-b border-border"
    >
      {/* Left side — SOC status bar */}
      <SocStatusBar />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Credits */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-mono text-muted-foreground">
          <Zap className="w-3 h-3 text-accent" />
          <span className="hidden sm:inline">
            <span className="text-primary">100</span> credits
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-mono text-primary leading-tight">{user?.fullName || "operator"}</p>
            <p className="text-[9px] font-mono text-muted-foreground">FREE PLAN</p>
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-6 h-6 rounded-sm ring-1 ring-primary/30",
                userButtonTrigger: "hover:opacity-80 transition-opacity",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
