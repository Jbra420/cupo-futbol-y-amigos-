-- =============================================================
-- 00001_create_matches.sql – Tabla de partidos
-- =============================================================

CREATE TABLE IF NOT EXISTS public.matches (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id  uuid        NOT NULL REFERENCES auth.users(id),
  slug          text        NOT NULL UNIQUE,
  title         text        NOT NULL,
  starts_at     timestamptz NOT NULL,
  location      text        NOT NULL,
  capacity      int         NOT NULL
                            CHECK (capacity BETWEEN 6 AND 22 AND capacity % 2 = 0),
  status        text        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','full','teams_ready','finished')),
  price_per_player numeric(10,2),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_slug ON public.matches (slug);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
