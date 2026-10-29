-- Optional, public venue link. Existing events and RPC signatures remain compatible.
ALTER TABLE public.matches ADD COLUMN maps_url text;
ALTER TABLE public.matches ADD CONSTRAINT matches_maps_url_valid CHECK (
  maps_url IS NULL OR (
    length(maps_url) <= 4096 AND maps_url = btrim(maps_url) AND
    maps_url ~ '^https://((www[.])?google[.]com/maps([/?#]|$)|maps[.]google[.]com/([?#]|maps([/?#]|$))|maps[.]app[.]goo[.]gl/[A-Za-z0-9_-]+/?([?#]|$)|goo[.]gl/maps/[A-Za-z0-9_-]+/?([?#]|$))'
  )
);
GRANT SELECT (maps_url) ON public.matches TO anon, authenticated;

-- The existing create/edit operations enforce the sole administrator, locking,
-- editable status and revision checks. Map changes are in the same transaction.
CREATE FUNCTION public.create_match_with_map(p_title text, p_starts_at timestamptz, p_location text,
  p_capacity integer, p_price_per_player numeric DEFAULT NULL, p_maps_url text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_created jsonb; v_match public.matches;
BEGIN
  v_created := public.create_match(p_title, p_starts_at, p_location, p_capacity, p_price_per_player);
  UPDATE public.matches SET maps_url = NULLIF(btrim(p_maps_url), '')
    WHERE id = (v_created->>'id')::uuid RETURNING * INTO v_match;
  RETURN to_jsonb(v_match) - 'organizer_id';
END;
$$;
REVOKE ALL ON FUNCTION public.create_match_with_map(text,timestamptz,text,integer,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_match_with_map(text,timestamptz,text,integer,numeric,text) TO authenticated;

CREATE FUNCTION public.update_match_event_with_map(p_match_id uuid, p_title text, p_starts_at timestamptz,
  p_location text, p_capacity integer, p_expected_revision bigint, p_price_per_player numeric DEFAULT NULL,
  p_maps_url text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.update_match_event(p_match_id, p_title, p_starts_at, p_location, p_capacity,
    p_expected_revision, p_price_per_player);
  UPDATE public.matches SET maps_url = NULLIF(btrim(p_maps_url), '') WHERE id = p_match_id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_match_event_with_map(uuid,text,timestamptz,text,integer,bigint,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_event_with_map(uuid,text,timestamptz,text,integer,bigint,numeric,text) TO authenticated;

-- Keep the public projection explicit. Realtime already signals all edits via revision.
CREATE OR REPLACE FUNCTION public.get_public_match(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'match', jsonb_build_object('id', m.id, 'slug', m.slug, 'title', m.title,
      'starts_at', m.starts_at, 'location', m.location, 'maps_url', m.maps_url, 'capacity', m.capacity,
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
