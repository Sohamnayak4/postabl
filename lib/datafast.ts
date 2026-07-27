// DataFast analytics (https://datafa.st) — pageviews + product events.
//
// Client-side only: the SDK touches window at init. `getDataFast()` is a
// lazy singleton so the SDK initializes once per tab no matter how many
// callers ask for it; `trackEvent()` is the fire-and-forget wrapper the
// app should use for product events (it never throws, so a blocked or
// failed analytics script can't break a user flow).
//
// Pageviews (including client-side route changes) are captured
// automatically via autoCapturePageviews; see components/datafast.tsx
// for the mount point. Localhost traffic is ignored by the SDK's
// default (allowLocalhost: false), so dev sessions don't pollute stats.

import { initDataFast, type DataFastClient } from "datafast";

// Public client-side identifier, same class of value as a GA measurement
// id — safe to ship in the bundle.
const WEBSITE_ID = "dfid_G2NVU0DRXBF40cMWO1OkE";

let clientPromise: Promise<DataFastClient> | null = null;

export function getDataFast(): Promise<DataFastClient> {
  if (!clientPromise) {
    clientPromise = initDataFast({
      websiteId: WEBSITE_ID,
      // Mirrors the data-domain in DataFast's dashboard snippet so
      // events attribute to the registered site regardless of the
      // serving hostname (www, previews).
      domain: "postabl.xyz",
      autoCapturePageviews: true,
      // Console logging in dev only — mirrors how Vercel Analytics
      // behaves. Localhost events are never sent either way
      // (allowLocalhost defaults to false).
      debug: process.env.NODE_ENV === "development",
    });
  }
  return clientPromise;
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;
  void getDataFast()
    .then((df) => df.track(name, properties))
    .catch(() => {
      // Analytics must never break the app — swallow init/track errors
      // (ad blockers, offline, etc).
    });
}
