// GET /api/xshare/avatar?url=<https://pbs.twimg.com/...>
//
// Same-origin proxy for X avatars and banners. Without it, html-to-image
// draws a cross-origin image into the export canvas, taints it, and every
// toPng/toBlob call throws — which would break download, copy and the
// "Edit in Postabl" handoff all at once.
//
// The host allowlist is the whole security story here: it keeps the route
// from being a general-purpose SSRF fetcher for anyone who finds it.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOSTS = new Set([
  "pbs.twimg.com",
  "abs.twimg.com",
  "ton.twitter.com",
]);

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Postabl/1.0 (xshare media proxy; +postabl.xyz)",
        Accept: "image/*",
      },
      next: { revalidate: 3600 },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 502 }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
