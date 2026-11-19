-- Applied to the Neon production branch on 2026-11-19.
-- Non-destructive additions for the admin publishing workspace.
CREATE TABLE IF NOT EXISTS platform_publications (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('article','music','video','announcement','poetry','event','opportunity','gallery')),
  title text NOT NULL,
  author text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Geral',
  description text NOT NULL DEFAULT '',
  external_url text NOT NULL DEFAULT '',
  media_url text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_by text REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_publications_status_created_idx
  ON platform_publications (status, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_admin_login_attempts (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_admin_login_attempts_ip_time_idx
  ON platform_admin_login_attempts (ip_hash, attempted_at DESC);
