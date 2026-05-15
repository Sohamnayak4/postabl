import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type ProRow = {
  is_pro: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
};

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  // Pro state lives in the DB, not the session cookie — the cookie is
  // long-lived and we don't want to bake a stale flag in. Hitting Neon
  // on every /me read is fine (HTTP driver, single indexed lookup).
  let pro: ProRow = {
    is_pro: false,
    subscription_status: null,
    current_period_end: null,
  };
  try {
    const rows = (await sql`
      SELECT is_pro, subscription_status, current_period_end
      FROM users
      WHERE id = ${session.userId}
    `) as ProRow[];
    if (rows[0]) pro = rows[0];
  } catch (err) {
    // DB blip — return false-y Pro state rather than 500ing the whole
    // session check. The client will retry on its next /me call.
    console.error("/api/auth/me: DB lookup failed", err);
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      isPro: pro.is_pro,
      subscriptionStatus: pro.subscription_status,
      currentPeriodEnd: pro.current_period_end,
    },
  });
}
