// POST /api/webhooks/lemon-squeezy
//
// Receives Lemon Squeezy subscription events and reflects them into the
// users table. The flow:
//   1. Read the *raw* request body — JSON.parse would re-order keys and
//      break the HMAC match.
//   2. Verify X-Signature against LEMONSQUEEZY_WEBHOOK_SECRET. Reject
//      unsigned/forged requests with 401.
//   3. Resolve the user — prefer meta.custom_data.user_id (set when we
//      built the checkout URL), fall back to data.attributes.user_email.
//   4. Translate the event to a row update via mapEventToState.
//   5. Apply the update. Always return 2xx so LS marks the event
//      delivered; non-200 triggers LS's retry storm which is rarely the
//      right move (especially for "user not found").

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  LSWebhookPayload,
  mapEventToState,
  verifyLemonSqueezySignature,
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

type UserIdRow = { id: string };

export async function POST(req: NextRequest) {
  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    console.error("LS webhook: LEMONSQUEEZY_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { ok: false, error: "webhook_secret_missing" },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 401 }
    );
  }

  let payload: LSWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const eventName = payload.meta.event_name;
  const customUserId = payload.meta.custom_data?.user_id;
  const userEmail = payload.data.attributes.user_email;
  const subscriptionId = payload.data.id;

  // Resolve the user. custom_data.user_id is the trustworthy path —
  // email can collide if a user changes their address upstream.
  let user: UserIdRow | null = null;
  if (customUserId) {
    const rows = (await sql`
      SELECT id FROM users WHERE id = ${customUserId}
    `) as UserIdRow[];
    user = rows[0] ?? null;
  }
  if (!user && userEmail) {
    const rows = (await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `) as UserIdRow[];
    user = rows[0] ?? null;
  }

  if (!user) {
    // Ack with 200 so LS doesn't retry — the user genuinely isn't in
    // our DB (could be a test event, or a checkout without auth).
    console.warn("LS webhook: no matching user", {
      eventName,
      customUserId,
      userEmail,
    });
    return NextResponse.json({ ok: true, skipped: "no_matching_user" });
  }

  const decision = mapEventToState(payload);
  if (decision.kind === "ignore") {
    console.log("LS webhook: ignored", {
      eventName,
      reason: decision.reason,
      userId: user.id,
    });
    return NextResponse.json({ ok: true, ignored: decision.reason });
  }

  const periodEndIso = decision.periodEnd
    ? new Date(decision.periodEnd).toISOString()
    : null;

  await sql`
    UPDATE users
    SET is_pro              = ${decision.isPro},
        subscription_id     = ${subscriptionId},
        subscription_status = ${decision.status},
        current_period_end  = ${periodEndIso},
        updated_at          = now()
    WHERE id = ${user.id}
  `;

  console.log("LS webhook: applied", {
    eventName,
    userId: user.id,
    isPro: decision.isPro,
    status: decision.status,
    periodEnd: periodEndIso,
  });

  return NextResponse.json({
    ok: true,
    event: eventName,
    is_pro: decision.isPro,
  });
}
