-- =============================================================
-- 00004_create_teams.sql – Equipos de un partido (máx 2)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id        uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id  uuid  NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  name      text  NOT NULL,
  color     text  NOT NULL DEFAULT '#3B82F6',
  idx       int   NOT NULL CHECK (idx IN (0, 1)),
  UNIQUE(match_id, idx)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
