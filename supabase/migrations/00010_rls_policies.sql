-- =============================================================
-- 00010_rls_policies.sql – Políticas de Row Level Security
-- =============================================================

-- ─────────────────────────────────────────────
-- matches
-- ─────────────────────────────────────────────
CREATE POLICY matches_select ON public.matches
  FOR SELECT USING (true);

CREATE POLICY matches_insert ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY matches_update ON public.matches
  FOR UPDATE USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY matches_delete ON public.matches
  FOR DELETE USING (auth.uid() = organizer_id);

-- ─────────────────────────────────────────────
-- registrations
-- ─────────────────────────────────────────────
CREATE POLICY registrations_select ON public.registrations
  FOR SELECT USING (true);

-- Inserción directa bloqueada – solo vía RPC join_match (SECURITY DEFINER)
CREATE POLICY registrations_insert ON public.registrations
  FOR INSERT WITH CHECK (false);

CREATE POLICY registrations_update ON public.registrations
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT organizer_id FROM public.matches WHERE id = match_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = (SELECT organizer_id FROM public.matches WHERE id = match_id)
  );

CREATE POLICY registrations_delete ON public.registrations
  FOR DELETE USING (
    auth.uid() = (SELECT organizer_id FROM public.matches WHERE id = match_id)
  );

-- ─────────────────────────────────────────────
-- players
-- ─────────────────────────────────────────────
CREATE POLICY players_all ON public.players
  FOR ALL USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- ─────────────────────────────────────────────
-- teams
-- ─────────────────────────────────────────────
CREATE POLICY teams_select ON public.teams
  FOR SELECT USING (true);

CREATE POLICY teams_insert ON public.teams
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT organizer_id FROM public.matches WHERE id = match_id)
  );

CREATE POLICY teams_update ON public.teams
  FOR UPDATE USING (
    auth.uid() = (SELECT organizer_id FROM public.matches WHERE id = match_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT organizer_id FROM public.matches WHERE id = match_id)
  );

CREATE POLICY teams_delete ON public.teams
  FOR DELETE USING (
    auth.uid() = (SELECT organizer_id FROM public.matches WHERE id = match_id)
  );

-- ─────────────────────────────────────────────
-- team_assignments
-- ─────────────────────────────────────────────
CREATE POLICY team_assignments_select ON public.team_assignments
  FOR SELECT USING (true);

CREATE POLICY team_assignments_insert ON public.team_assignments
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT m.organizer_id
        FROM public.matches m
        JOIN public.teams t ON t.match_id = m.id
       WHERE t.id = team_id
    )
  );

CREATE POLICY team_assignments_update ON public.team_assignments
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT m.organizer_id
        FROM public.matches m
        JOIN public.teams t ON t.match_id = m.id
       WHERE t.id = team_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT m.organizer_id
        FROM public.matches m
        JOIN public.teams t ON t.match_id = m.id
       WHERE t.id = team_id
    )
  );

CREATE POLICY team_assignments_delete ON public.team_assignments
  FOR DELETE USING (
    auth.uid() IN (
      SELECT m.organizer_id
        FROM public.matches m
        JOIN public.teams t ON t.match_id = m.id
       WHERE t.id = team_id
    )
  );

-- ─────────────────────────────────────────────
-- Realtime – habilitar publicación para suscripciones en tiempo real
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
