// App Initialization
// On Vercel serverless, no background queue is needed because analysis
// runs synchronously via the GitHub API (inline in API route handlers).
// This file is kept for future extensibility (e.g., Upstash QStash worker).

let initialized = false;

export function initializeApp(): void {
  if (initialized) return;
  initialized = true;
  console.log("[ACRE] System initialized");
}
