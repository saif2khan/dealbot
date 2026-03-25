-- Add photo_url to items (first photo from FB listing, or null for manual entries)
ALTER TABLE public.items ADD COLUMN photo_url TEXT;
