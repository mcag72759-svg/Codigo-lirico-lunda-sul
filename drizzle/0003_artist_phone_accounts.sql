-- Artist account access uses a normalized phone number.
-- The partial expression index prevents duplicate numbers even when punctuation differs.
CREATE UNIQUE INDEX IF NOT EXISTS artist_applications_phone_digits_unique
  ON public.artist_applications ((regexp_replace(phone, '[^0-9]', '', 'g')))
  WHERE btrim(phone) <> '';
