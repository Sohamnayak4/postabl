// Server component — runs on every request to /signin. Reads the
// session cookie and, if the visitor is already authenticated, sends
// them straight to /editor (or wherever ?next= points). This prevents
// the "I just signed in, why am I on /signin again?" papercut when a
// returning user clicks the landing page's CTA.

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import SignInForm from "./signin-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;
  const session = await getSessionFromCookie();
  if (session) {
    // Honor a safe `next` path; default to /editor.
    const dest =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/editor";
    redirect(dest);
  }
  return <SignInForm />;
}
