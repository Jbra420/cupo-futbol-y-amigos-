-- =============================================================
-- 00003_create_players.sql – Plantilla de jugadores del organizador
-- =============================================================

CREATE TABLE IF NOT EXISTS public.players (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id       uuid        NOT NULL REFERENCES auth.users(id),
  name               text        NOT NULL,
  preferred_position text        CHECK (preferred_position IN ('POR','DEF','MED','DEL')),
  skill              int         NOT NULL DEFAULT 3
                                 CHECK (skill BETWEEN 1 AND 5),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Un organizador no puede tener dos jugadores con el mismo nombre.
CREATE UNIQUE INDEX idx_players_unique_name
  ON public.players (organizer_id, lower(name));

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
