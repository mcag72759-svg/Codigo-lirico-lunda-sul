-- Canonical phone identity for artist accounts.
-- A nine-digit Angolan mobile number is equivalent to its +244 international form.
DROP INDEX IF EXISTS public.artist_applications_phone_digits_unique;
CREATE UNIQUE INDEX artist_applications_phone_digits_unique
  ON public.artist_applications ((
    CASE
      WHEN length(regexp_replace(phone, '[^0-9]', '', 'g')) = 9
        AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '9%'
      THEN '244' || regexp_replace(phone, '[^0-9]', '', 'g')
      ELSE regexp_replace(phone, '[^0-9]', '', 'g')
    END
  ))
  WHERE btrim(phone) <> '';
