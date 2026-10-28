CREATE FUNCTION private.normalize_frequent_player() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.name := btrim(regexp_replace(NEW.name, '[[:space:]]+', ' ', 'g'));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.normalize_frequent_player() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER normalize_frequent_player BEFORE INSERT OR UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION private.normalize_frequent_player();

-- Explicit allowlist: future private columns must never silently enter a public snapshot.
CREATE OR REPLACE FUNCTION public.get_public_match(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'match', jsonb_build_object('id', m.id, 'slug', m.slug, 'title', m.title,
      'starts_at', m.starts_at, 'location', m.location, 'capacity', m.capacity,
      'status', m.status, 'price_per_player', m.price_per_player, 'revision', m.revision),
    'registrations', COALESCE((SELECT jsonb_agg(
      jsonb_build_object('id', r.id, 'player_name', r.player_name, 'position', r.position,
        'status', r.status, 'waitlist_position', CASE WHEN r.status = 'waitlist' THEN (
          SELECT count(*) FROM public.registrations q WHERE q.match_id = m.id AND q.status = 'waitlist'
            AND (q.created_at, q.id) <= (r.created_at, r.id)
        ) ELSE NULL END) ORDER BY r.created_at, r.id)
      FROM public.registrations r WHERE r.match_id = m.id AND r.status <> 'cancelled'), '[]'::jsonb),
    'teams', CASE WHEN m.status IN ('teams_ready', 'finished') THEN
      COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.idx) FROM public.teams t WHERE t.match_id = m.id), '[]'::jsonb)
      ELSE '[]'::jsonb END,
    'assignments', CASE WHEN m.status IN ('teams_ready', 'finished') THEN
      COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.team_assignments a WHERE a.match_id = m.id), '[]'::jsonb)
      ELSE '[]'::jsonb END
  ) FROM public.matches m WHERE m.slug = p_slug;
$$;
