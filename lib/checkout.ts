// Build the Lemon Squeezy hosted checkout URL with the user's email
// pre-filled and a custom user_id round-trip so the webhook can match
// the order back to the right account.
//
// Lemon Squeezy reads the following query params on its hosted checkout:
//   checkout[email]                — pre-fills the email field
//   checkout[custom][<key>]        — passes data straight through to
//                                    the webhook at meta.custom_data
//   checkout[discount_code]        — applies a discount code (unused)
//
// We use `user_id` for the custom field; the webhook handler reads
// payload.meta.custom_data.user_id when applying state updates.

export function buildCheckoutUrl(user: {
  id: string;
  email: string;
}): string | null {
  const base = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL;
  if (!base) {
    // Caller surfaces this — we'd rather return null than throw so the
    // editor can show a graceful "checkout unavailable" state instead
    // of a redbox in production.
    return null;
  }
  const url = new URL(base);
  url.searchParams.set("checkout[email]", user.email);
  url.searchParams.set("checkout[custom][user_id]", user.id);
  return url.toString();
}
