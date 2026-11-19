-- Additive platform features: private messaging, post analytics, rich artist posts and scheduling.
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'general';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS organizer text NOT NULL DEFAULT '';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS event_starts_at timestamptz;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ticket_price text NOT NULL DEFAULT '';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS ticket_url text NOT NULL DEFAULT '';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE TABLE IF NOT EXISTS community_conversations (
  id text PRIMARY KEY,
  participant_a text NOT NULL,
  participant_b text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_conversations_pair_key UNIQUE (participant_a, participant_b),
  CONSTRAINT community_conversations_participants_order CHECK (participant_a < participant_b)
);
CREATE INDEX IF NOT EXISTS community_conversations_participant_a_idx
  ON community_conversations (participant_a, updated_at DESC);
CREATE INDEX IF NOT EXISTS community_conversations_participant_b_idx
  ON community_conversations (participant_b, updated_at DESC);

CREATE TABLE IF NOT EXISTS community_post_views (
  id bigserial PRIMARY KEY,
  post_id text NOT NULL,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_post_views_visitor_key UNIQUE (post_id, visitor_hash)
);
CREATE INDEX IF NOT EXISTS community_post_views_post_created_idx
  ON community_post_views (post_id, created_at DESC);

ALTER TABLE platform_publications ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE platform_publications ADD COLUMN IF NOT EXISTS event_starts_at timestamptz;
ALTER TABLE platform_publications ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
ALTER TABLE platform_publications ADD COLUMN IF NOT EXISTS organizer text NOT NULL DEFAULT '';
ALTER TABLE platform_publications ADD COLUMN IF NOT EXISTS ticket_price text NOT NULL DEFAULT '';
ALTER TABLE platform_publications ADD COLUMN IF NOT EXISTS ticket_url text NOT NULL DEFAULT '';
ALTER TABLE platform_publications DROP CONSTRAINT IF EXISTS platform_publications_status_check;
ALTER TABLE platform_publications ADD CONSTRAINT platform_publications_status_check
  CHECK (status IN ('draft', 'published', 'scheduled', 'archived'));
