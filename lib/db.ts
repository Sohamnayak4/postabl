import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check .env.local");
}

// Tagged-template SQL helper bound to the Neon HTTP driver. Safe for
// serverless and edge — connection-less.
export const sql = neon(process.env.DATABASE_URL);

export type UserRow = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  provider: string | null;
  provider_sub: string | null;
  is_pro: boolean;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};
