"use client";

import { create } from "zustand";
import type { DashboardStats, Notification, ActivityEvent } from "@codebuff/shared";

interface AppState {
  // Dashboard
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;

  // Activity
  recentActivity: ActivityEvent[];
  addActivity: (event: ActivityEvent) => void;

  // UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Dashboard
  stats: null,
  setStats: (stats) => set({ stats }),

  // Notifications
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  // Activity
  recentActivity: [],
  addActivity: (event) =>
    set((state) => ({
      recentActivity: [event, ...state.recentActivity].slice(0, 50),
    })),

  // UI
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
