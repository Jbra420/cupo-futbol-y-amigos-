-- Remove permissive policies before installing the final access model.
DO $$ DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('matches', 'registrations', 'players', 'teams', 'team_assignments')
  LOOP EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename); END LOOP;
END $$;

REVOKE ALL ON public.matches, public.registrations, public.players, public.teams, public.team_assignments
  FROM PUBLIC, anon, authenticated;

-- Column grants protect even hand-written REST queries; RLS alone cannot do so.
GRANT SELECT (id, slug, title, starts_at, location, capacity, status, price_per_player, revision)
  ON public.matches TO anon, authenticated;
GRANT SELECT (id, match_id, player_name, position, status)
  ON public.registrations TO anon, authenticated;
GRANT SELECT ON public.teams, public.team_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;

CREATE POLICY matches_read ON public.matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY registrations_read ON public.registrations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY players_owner ON public.players FOR ALL TO authenticated
  USING (organizer_id = (SELECT auth.uid()) AND (SELECT private.is_google_organizer()))
  WITH CHECK (organizer_id = (SELECT auth.uid()) AND (SELECT private.is_google_organizer()));
CREATE POLICY teams_read ON public.teams FOR SELECT TO anon, authenticated
  USING (private.can_read_lineup(match_id));
CREATE POLICY assignments_read ON public.team_assignments FOR SELECT TO anon, authenticated
  USING (private.can_read_lineup(match_id));

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_google_organizer(), private.is_match_organizer(uuid), private.can_read_lineup(uuid)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.update_match_status(), public.join_match(text, text, text),
  public.cancel_registration(uuid), public.reduce_capacity(uuid, integer),
  public.set_match_capacity(uuid, integer), public.add_match_player(uuid, text, text),
  public.create_match(text, timestamptz, text, integer, numeric),
  public.update_match_details(uuid, text, timestamptz, text, numeric),
  public.set_registration_paid(uuid, boolean), public.get_my_registration(text),
  public.get_public_match(text), public.list_organizer_matches(), public.get_admin_match(uuid),
  public.save_match_teams(uuid, jsonb, jsonb, boolean), public.finish_match(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_match(text), public.get_my_registration(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_match(text, text, text), public.cancel_registration(uuid),
  public.reduce_capacity(uuid, integer), public.set_match_capacity(uuid, integer),
  public.add_match_player(uuid, text, text), public.create_match(text, timestamptz, text, integer, numeric),
  public.update_match_details(uuid, text, timestamptz, text, numeric), public.set_registration_paid(uuid, boolean),
  public.list_organizer_matches(), public.get_admin_match(uuid),
  public.save_match_teams(uuid, jsonb, jsonb, boolean), public.finish_match(uuid) TO authenticated;

-- Replicate only safe columns, regardless of what a subscriber requests.
-- Admins refresh their authorized snapshot on matches.revision, including payment changes.
ALTER PUBLICATION supabase_realtime SET TABLE
  public.matches (id, slug, title, starts_at, location, capacity, status, price_per_player, revision),
  public.registrations (id, match_id, player_name, position, status),
  public.teams (id, match_id, name, color, idx),
  public.team_assignments (registration_id, team_id, match_id, pitch_x, pitch_y);
