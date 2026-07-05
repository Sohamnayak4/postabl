-- Postabl database schema (OAuth-only).
-- Run via scripts/migrate.mjs. Idempotent — safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                citext UNIQUE NOT NULL,
  name                 text NOT NULL,
  avatar_url           text,
  provider             text,
  provider_sub         text,
  is_pro               boolean NOT NULL DEFAULT false,
  subscription_id      text,
  subscription_status  text,
  current_period_end   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Upgrade older deployments that predate OAuth:
--   * add new columns
--   * drop the legacy password_hash column (no longer used)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_sub text;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Lemon Squeezy subscription tracking:
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Brand Kit (Pro feature) — per-user defaults + handle badge that
-- auto-applies on new editor sessions. JSONB keeps schema evolution
-- cheap; the server validates shape before writing.
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_kit jsonb;

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_sub_idx ON users (provider, provider_sub);
CREATE INDEX IF NOT EXISTS users_subscription_id_idx ON users (subscription_id);
