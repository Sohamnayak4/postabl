import crypto from "node:crypto";

// Google OAuth 2.0 endpoints (OIDC).
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
};

type GoogleTokens = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth isn't configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local"
    );
  }
  return { clientId, clientSecret, redirectUri };
}

// ---- PKCE + state helpers --------------------------------------------

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateState(): string {
  return base64Url(crypto.randomBytes(16));
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

// ---- Flow URLs --------------------------------------------------------

export function buildAuthorizeUrl(state: string, challenge: string): string {
  const { clientId, redirectUri } = getGoogleConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  // `select_account` lets the user pick even if they're already signed in —
  // saves a confusing "wrong account" loop.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

// ---- Token exchange + profile fetch ----------------------------------

export async function exchangeCode(
  code: string,
  verifier: string
): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function fetchGoogleProfile(
  accessToken: string
): Promise<GoogleProfile> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google userinfo failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleProfile;
}
