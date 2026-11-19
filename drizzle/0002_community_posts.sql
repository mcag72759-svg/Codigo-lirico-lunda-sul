CREATE TABLE IF NOT EXISTS community_posts (
  id text PRIMARY KEY,
  author_id text NOT NULL REFERENCES artist_applications(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  media_url text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'none',
  visibility text NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_body_or_media CHECK (length(trim(body)) > 0 OR length(trim(media_url)) > 0),
  CONSTRAINT community_posts_visibility CHECK (visibility IN ('public','followers')),
  CONSTRAINT community_posts_status CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX IF NOT EXISTS community_posts_status_created_idx ON community_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_created_idx ON community_posts(author_id, created_at DESC);
CREATE TABLE IF NOT EXISTS community_comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES artist_applications(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_comments_post_created_idx ON community_comments(post_id, created_at ASC);
