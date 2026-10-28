-- =============================================================
-- 00005_create_team_assignments.sql – Asignación jugador → equipo
-- =============================================================

CREATE TABLE IF NOT EXISTS public.team_assignments (
  registration_id uuid  PRIMARY KEY REFERENCES public.registrations(id) ON DELETE CASCADE,
  team_id         uuid  NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  pitch_x         float NOT NULL DEFAULT 50
                        CHECK (pitch_x BETWEEN 0 AND 100),
  pitch_y         float NOT NULL DEFAULT 50
                        CHECK (pitch_y BETWEEN 0 AND 100)
);

ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;
