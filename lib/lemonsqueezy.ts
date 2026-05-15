// Server-only Lemon Squeezy helpers — webhook signature verification
// and the event-name → DB-state mapping. Kept separate from the route
// handler so the mapping logic is easy to read and unit-test later.

import crypto from "node:crypto";

// ---- Signature verification --------------------------------------------

// LS signs every webhook with HMAC-SHA256(secret, raw_body) and ships
// the hex digest in the `X-Signature` header. Using the raw body string
// (not the parsed JSON) is critical — re-serializing JSON re-orders
// keys and the signature won't match.
export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // timingSafeEqual requires equal-length buffers — bail early if they
  // diverge so we don't throw on length mismatch.
  if (expected.length !== signatureHeader.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signatureHeader, "hex")
    );
  } catch {
    return false;
  }
}

// ---- Webhook payload shape ---------------------------------------------

export type LSWebhookPayload = {
  meta: {
    event_name: string;
    test_mode: boolean;
    custom_data?: { user_id?: string };
  };
  data: {
    type: string;
    id: string;
    attributes: {
      status: string;
      user_email: string;
      user_name?: string;
      renews_at: string | null;
      ends_at: string | null;
      store_id?: number;
      variant_id?: number;
      product_id?: number;
      [key: string]: unknown;
    };
  };
};

// ---- Event → state mapper ----------------------------------------------

export type SubscriptionStateUpdate =
  | { kind: "apply"; isPro: boolean; status: string; periodEnd: string | null }
  | { kind: "ignore"; reason: string };

// Translate an LS event into the row update we want to apply. Returning
// "ignore" for events like `subscription_payment_failed` lets the route
// handler ack the webhook (so LS doesn't retry forever) without yanking
// access on a single transient failure.
export function mapEventToState(
  payload: LSWebhookPayload
): SubscriptionStateUpdate {
  const eventName = payload.meta.event_name;
  const attrs = payload.data.attributes;
  const status = attrs.status;
  // Prefer renews_at while active; fall back to ends_at when the sub
  // is cancelled/expired so the row reflects the real cutoff.
  const periodEnd = attrs.renews_at ?? attrs.ends_at ?? null;

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed":
    case "subscription_unpaused":
    case "subscription_payment_success":
      return {
        kind: "apply",
        // `cancelled` is included intentionally — LS sends it the moment
        // a user cancels, but they keep access until the period ends and
        // the `subscription_expired` event fires.
        isPro: ["active", "on_trial", "past_due", "cancelled"].includes(
          status
        ),
        status,
        periodEnd,
      };

    case "subscription_cancelled":
      // The user clicked cancel — period continues, so don't yank yet.
      return { kind: "apply", isPro: true, status: "cancelled", periodEnd };

    case "subscription_paused":
    case "subscription_expired":
      return { kind: "apply", isPro: false, status, periodEnd };

    case "subscription_payment_failed":
      // LS retries on its own; logging is enough. If the retries run out
      // LS will fire `subscription_expired` and we'll flip is_pro then.
      return { kind: "ignore", reason: "payment_failed_retry_in_progress" };

    default:
      return { kind: "ignore", reason: `unhandled_event:${eventName}` };
  }
}
