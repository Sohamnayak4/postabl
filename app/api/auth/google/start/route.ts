import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildAuthorizeUrl,
  generatePkce,
  generateState,
} from "@/lib/oauth-google";

export const runtime = "nodejs";

const OAUTH_COOKIE_MAX_AGE = 60 * 10; // 10 minutes — plenty for the round-trip

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");

  const state = generateState();
  const { verifier, challenge } = generatePkce();

  const store = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };
  store.set("postabl_oauth_state", state, opts);
  store.set("postabl_oauth_verifier", verifier, opts);

  // Only persist the redirect target if it's a same-origin path — prevents
  // open-redirect abuse via ?next=https://evil.example.
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    store.set("postabl_oauth_next", next, opts);
  }

  try {
    const authorizeUrl = buildAuthorizeUrl(state, challenge);
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    console.error("Google OAuth start failed", err);
    return NextResponse.redirect(new URL("/signin?error=oauth_config", req.url));
  }
}
