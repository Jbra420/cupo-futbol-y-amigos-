-- =============================================================
-- 00002_create_registrations.sql – Inscripciones a partidos
-- =============================================================

CREATE TABLE IF NOT EXISTS public.registrations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL DEFAULT auth.uid(),
  player_name  text        NOT NULL,
  position     text        NOT NULL
                           CHECK (position IN ('POR','DEF','MED','DEL')),
  status       text        NOT NULL DEFAULT 'confirmed'
                           CHECK (status IN ('confirmed','waitlist','cancelled')),
  paid         boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Un mismo nombre (case-insensitive) no puede estar inscrito dos veces
-- en el mismo partido salvo que esté cancelado.
CREATE UNIQUE INDEX idx_reg_unique_name
  ON public.registrations (match_id, lower(player_name))
  WHERE status != 'cancelled';

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
