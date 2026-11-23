-- Reliability and integrity improvements after the full platform audit.

-- Artist sign-up/login throttling. IP addresses are stored only as SHA-256 hashes.
CREATE TABLE IF NOT EXISTS public.artist_auth_attempts (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  action text NOT NULL CHECK (action IN ('register', 'login')),
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS artist_auth_attempts_ip_action_time_idx
  ON public.artist_auth_attempts (ip_hash, action, attempted_at DESC);

-- Comments are used on all public content types, not only community_posts.
-- Keep referential integrity with a trigger that validates polymorphic author/content IDs.
ALTER TABLE public.community_comments DROP CONSTRAINT IF EXISTS community_comments_author_id_fkey;
ALTER TABLE public.community_comments DROP CONSTRAINT IF EXISTS community_comments_post_id_fkey;

CREATE OR REPLACE FUNCTION public.validate_community_comment_refs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.artist_applications
    WHERE id = NEW.author_id AND status = 'approved'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE id = NEW.author_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Comment author is not an active artist or administrator'
      USING ERRCODE = '23503', CONSTRAINT = 'community_comments_author_reference_check';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE id = NEW.post_id AND status = 'approved'
      AND (scheduled_at IS NULL OR scheduled_at <= now() OR author_id = NEW.author_id)
  ) AND NOT EXISTS (
    SELECT 1 FROM public.published_content WHERE id = NEW.post_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.platform_publications
    WHERE id = NEW.post_id AND (status = 'published' OR (status = 'scheduled' AND scheduled_at <= now()))
  ) AND NOT EXISTS (
    SELECT 1 FROM public.artist_media m
    INNER JOIN public.artist_applications a ON a.id = m.application_id
    WHERE m.id = NEW.post_id AND m.status = 'approved'
      AND m.download_allowed = true AND a.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Comment target is not an available public publication'
      USING ERRCODE = '23503', CONSTRAINT = 'community_comments_post_reference_check';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_comments_validate_refs ON public.community_comments;
CREATE TRIGGER community_comments_validate_refs
  BEFORE INSERT OR UPDATE OF author_id, post_id ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_community_comment_refs();
