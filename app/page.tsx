// Server component for the root URL.
//
// Behavior: authenticated visitors get 307-redirected straight to
// /editor (no flash of the marketing page). Unauthenticated visitors
// see the marketing landing rendered by ./landing.tsx.
//
// Why server-side: doing this in a useEffect on the client would show
// the landing page for ~100ms before redirecting, which is exactly the
// "flash of unauthenticated content" we're trying to avoid.

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import LandingPage from "./landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSessionFromCookie();
  if (session) redirect("/editor");
  return <LandingPage />;
}
