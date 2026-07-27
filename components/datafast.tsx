"use client";

// Mounts DataFast once at the app root. The SDK auto-captures the
// initial pageview and client-side route changes, so this component
// renders nothing and only exists to trigger init on the client.
// Lives alongside the Vercel <Analytics /> mount in app/layout.tsx.

import { useEffect } from "react";
import { getDataFast } from "@/lib/datafast";

export function DataFastAnalytics() {
  useEffect(() => {
    void getDataFast().catch(() => {
      // Blocked or failed analytics must never surface to the user.
    });
  }, []);
  return null;
}
