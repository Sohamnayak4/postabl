// GET /api/xshare/profile?q=<url|@handle|handle>
//
// Resolves an X profile for the /xshare card builder via api.fxtwitter.com
// (free, keyless public mirror). Open to anonymous callers — /xshare is
// ungated in the same spirit as /editor.

import { NextRequest, NextResponse } from "next/server";
import {
  parseHandle,
  upgradeAvatarUrl,
  type XProfile,
  type XProfileResponse,
} from "@/lib/xshare";

export const runtime = "nodejs";

type FxUser = {
  name?: string;
  screen_name?: string;
  followers?: number;
  following?: number;
  avatar_url?: string;
  banner_url?: string | null;
  verification?: { verified?: boolean };
};

type FxResponse = {
  code?: number;
  message?: string;
  reason?: string;
  user?: FxUser;
};

function fail(
  error: string,
  code: string,
  status: number
): NextResponse<XProfileResponse> {
  return NextResponse.json({ ok: false, error, code }, { status });
}

export async function GET(req: NextRequest) {
  const raw =
    req.nextUrl.searchParams.get("q") ??
    req.nextUrl.searchParams.get("username") ??
    "";

  const handle = parseHandle(raw);
  if (!handle) {
    return fail(
      "That doesn't look like an X profile. Try x.com/username or @handle.",
      "INVALID_HANDLE",
      400
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Postabl/1.0 (xshare profile cards; +postabl.xyz)",
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    const data = (await res.json().catch(() => null)) as FxResponse | null;

    if (!res.ok || !data || data.code !== 200 || !data.user) {
      const suspended =
        data?.reason === "suspended" ||
        Boolean(data?.message?.toLowerCase().includes("suspend"));
      return suspended
        ? fail("That account is suspended.", "SUSPENDED", 404)
        : fail(
            "Profile not found. Check the handle and try again.",
            "NOT_FOUND",
            404
          );
    }

    const u = data.user;
    const avatarRaw = u.avatar_url ?? "";
    const profile: XProfile = {
      name: u.name ?? handle,
      username: u.screen_name ?? handle,
      followers: typeof u.followers === "number" ? u.followers : 0,
      following: typeof u.following === "number" ? u.following : 0,
      avatarUrl: avatarRaw ? upgradeAvatarUrl(avatarRaw) : "",
      bannerUrl: u.banner_url ?? null,
      verified: Boolean(u.verification?.verified),
    };

    return NextResponse.json({ ok: true, profile } satisfies XProfileResponse);
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return aborted
      ? fail("That took too long. Try again.", "TIMEOUT", 504)
      : fail("Couldn't reach X right now. Try again.", "UPSTREAM", 502);
  } finally {
    clearTimeout(timeout);
  }
}
