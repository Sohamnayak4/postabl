import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Routes behind auth. Anything matched here requires a valid session cookie;
// unauthenticated visits get kicked to /signin with ?next= preserving where
// they were going.
//
// /editor is intentionally NOT gated: anonymous visitors can use the tool
// end-to-end with 2 free downloads/day (counted in localStorage). The
// editor page itself shows a sign-in prompt when the user tries to
// Download, Save, or use a Pro-only feature — that's where signup
// intent peaks, so we capture them there instead of at the front door.
export const config = {
  matcher: ["/saved/:path*", "/brand-kit/:path*"],
};

const SESSION_COOKIE = "postabl_session";

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const signinUrl = new URL("/signin", req.url);
  signinUrl.searchParams.set("next", req.nextUrl.pathname);

  if (!token) return NextResponse.redirect(signinUrl);

  const secret = getSecret();
  if (!secret) return NextResponse.redirect(signinUrl);

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(signinUrl);
  }
}
