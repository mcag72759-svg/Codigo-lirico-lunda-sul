-- Additive platform features: privacy-aware engagement, conversation lookup, rich posts and scheduling.
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'general';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS organizer text NOT NULL DEFAULT '';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS event_starts_at timestamptz;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS ticket_price text NOT NULL DEFAULT '';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS ticket_url text NOT NULL DEFAULT '';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS community_conversation_members_member_idx
  ON public.community_conversation_members (member_id);

CREATE TABLE IF NOT EXISTS public.community_post_views (
  id bigserial PRIMARY KEY,
  post_id text NOT NULL,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_post_views_visitor_key UNIQUE (post_id, visitor_hash)
);
CREATE INDEX IF NOT EXISTS community_post_views_post_created_idx
  ON public.community_post_views (post_id, created_at DESC);

ALTER TABLE public.platform_publications ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.platform_publications ADD COLUMN IF NOT EXISTS event_starts_at timestamptz;
ALTER TABLE public.platform_publications ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
ALTER TABLE public.platform_publications ADD COLUMN IF NOT EXISTS organizer text NOT NULL DEFAULT '';
ALTER TABLE public.platform_publications ADD COLUMN IF NOT EXISTS ticket_price text NOT NULL DEFAULT '';
ALTER TABLE public.platform_publications ADD COLUMN IF NOT EXISTS ticket_url text NOT NULL DEFAULT '';

ALTER TABLE public.platform_publications DROP CONSTRAINT IF EXISTS platform_publications_status_check;
ALTER TABLE public.platform_publications ADD CONSTRAINT platform_publications_status_check
  CHECK (status IN ('draft', 'published', 'scheduled', 'archived'));

ALTER TABLE public.platform_publications DROP CONSTRAINT IF EXISTS platform_publications_type_check;
ALTER TABLE public.platform_publications ADD CONSTRAINT platform_publications_type_check
  CHECK (type IN ('article', 'music', 'video', 'announcement', 'poetry', 'event', 'opportunity', 'gallery', 'organization', 'partnership', 'ticket'));
