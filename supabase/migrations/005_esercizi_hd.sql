-- Aggiunge supporto multi-risoluzione GIF e metadati dal nuovo dataset ExerciseDB Pro
ALTER TABLE public.esercizi ADD COLUMN IF NOT EXISTS gif_url_hd   TEXT;
ALTER TABLE public.esercizi ADD COLUMN IF NOT EXISTS difficulty   TEXT;
ALTER TABLE public.esercizi ADD COLUMN IF NOT EXISTS category     TEXT;
