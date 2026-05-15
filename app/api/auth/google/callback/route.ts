import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { setSessionCookie, signSession } from "@/lib/auth";
import { exchangeCode, fetchGoogleProfile } from "@/lib/oauth-google";

export const runtime = "nodejs";

type UpsertRow = { id: string; email: string; name: string };

function redirectToSignin(req: Request, error: string) {
  const url = new URL("/signin", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const store = await cookies();
  const savedState = store.get("postabl_oauth_state")?.value;
  const savedVerifier = store.get("postabl_oauth_verifier")?.value;
  const savedNext = store.get("postabl_oauth_next")?.value;

  // Clear the one-shot OAuth cookies up front — we don't want them to
  // survive a failed handshake.
  const clearOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  store.set("postabl_oauth_state", "", clearOpts);
  store.set("postabl_oauth_verifier", "", clearOpts);
  store.set("postabl_oauth_next", "", clearOpts);

  if (errorParam) {
    return redirectToSignin(req, errorParam);
  }
  if (
    !code ||
    !stateParam ||
    !savedState ||
    !savedVerifier ||
    stateParam !== savedState
  ) {
    // If the user already has a valid session cookie, they almost
    // certainly finished signing in on a previous request and this is
    // a duplicate callback (browser refresh, back/forward, Safe
    // Browsing intervention). Silently land them on the editor instead
    // of showing a scary "sign-in expired" error.
    const sessionToken = store.get("postabl_session")?.value;
    if (sessionToken) {
      const dest =
        savedNext && savedNext.startsWith("/") && !savedNext.startsWith("//")
          ? savedNext
          : "/editor";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return redirectToSignin(req, "bad_state");
  }

  try {
    const tokens = await exchangeCode(code, savedVerifier);
    const profile = await fetchGoogleProfile(tokens.access_token);

    if (!profile.email_verified) {
      return redirectToSignin(req, "email_not_verified");
    }

    // Find by (provider, provider_sub) first; fall back to email so an
    // existing email-only account (from before OAuth) gets merged.
    const existing = (await sql`
      SELECT id, email, name FROM users
      WHERE (provider = 'google' AND provider_sub = ${profile.sub})
         OR email = ${profile.email}
      ORDER BY
        CASE WHEN provider = 'google' AND provider_sub = ${profile.sub}
             THEN 0 ELSE 1 END
      LIMIT 1
    `) as UpsertRow[];

    let user: UpsertRow;
    if (existing.length > 0) {
      const u = existing[0];
      await sql`
        UPDATE users
        SET provider     = 'google',
            provider_sub = ${profile.sub},
            name         = ${profile.name ?? u.name},
            avatar_url   = ${profile.picture ?? null},
            updated_at   = now()
        WHERE id = ${u.id}
      `;
      user = {
        id: u.id,
        email: u.email,
        name: profile.name ?? u.name,
      };
    } else {
      const inserted = (await sql`
        INSERT INTO users (email, name, avatar_url, provider, provider_sub)
        VALUES (
          ${profile.email},
          ${profile.name ?? profile.email},
          ${profile.picture ?? null},
          'google',
          ${profile.sub}
        )
        RETURNING id, email, name
      `) as UpsertRow[];
      user = inserted[0];
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    await setSessionCookie(token);

    const dest =
      savedNext && savedNext.startsWith("/") && !savedNext.startsWith("//")
        ? savedNext
        : "/editor";
    return NextResponse.redirect(new URL(dest, req.url));
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    return redirectToSignin(req, "oauth_failed");
  }
}
