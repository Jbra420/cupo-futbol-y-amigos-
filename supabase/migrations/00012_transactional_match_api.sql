CREATE FUNCTION private.registration_result(p_registration_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('registration_id', r.id, 'player_name', r.player_name,
    'position', r.position, 'status', r.status, 'waitlist_position', CASE WHEN r.status = 'waitlist' THEN (
      SELECT count(*) FROM public.registrations q WHERE q.match_id = r.match_id AND q.status = 'waitlist'
        AND (q.created_at, q.id) <= (r.created_at, r.id)
    ) ELSE NULL END)
  FROM public.registrations r WHERE r.id = p_registration_id;
$$;

CREATE FUNCTION private.insert_registration(p_match public.matches, p_user_id uuid, p_name text, p_position text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_name text; v_status text;
BEGIN
  PERFORM private.require_editable(p_match);
  v_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Escribe un nombre de hasta 60 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF p_position IS NULL OR p_position NOT IN ('POR', 'DEF', 'MED', 'DEL') THEN
    RAISE EXCEPTION 'Elige una posición válida.' USING ERRCODE = '22023';
  END IF;
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.registrations
      WHERE match_id = p_match.id AND user_id = p_user_id AND status <> 'cancelled';
    IF FOUND THEN RETURN private.registration_result(v_id); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.registrations WHERE match_id = p_match.id
    AND lower(player_name) = lower(v_name) AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'Ya hay una persona con ese nombre. Agrega tu apellido.' USING ERRCODE = '23505';
  END IF;
  v_status := CASE WHEN (SELECT count(*) FROM public.registrations
    WHERE match_id = p_match.id AND status = 'confirmed') < p_match.capacity THEN 'confirmed' ELSE 'waitlist' END;
  INSERT INTO public.registrations (match_id, user_id, player_name, position, status)
    VALUES (p_match.id, p_user_id, v_name, p_position, v_status) RETURNING id INTO v_id;
  RETURN private.registration_result(v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_match(p_slug text, p_name text, p_position text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Necesitas una sesión para reservar tu cupo.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_match FROM public.matches WHERE slug = p_slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontramos este partido.' USING ERRCODE = '22023'; END IF;
  RETURN private.insert_registration(v_match, auth.uid(), p_name, p_position);
END;
$$;

CREATE FUNCTION public.add_match_player(p_match_id uuid, p_name text, p_position text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  v_match := private.require_match_organizer(p_match_id);
  RETURN private.insert_registration(v_match, NULL, p_name, p_position);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_registration(p_registration_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_reg public.registrations; v_match_id uuid; v_promoted uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Necesitas una sesión para cancelar.' USING ERRCODE = '42501'; END IF;
  -- Discover only the lock key, then reread all mutable state under that lock.
  SELECT match_id INTO v_match_id FROM public.registrations WHERE id = p_registration_id;
  SELECT * INTO v_match FROM public.matches WHERE id = v_match_id FOR UPDATE;
  SELECT * INTO v_reg FROM public.registrations WHERE id = p_registration_id;
  IF NOT FOUND OR (v_reg.user_id IS DISTINCT FROM auth.uid() AND NOT private.is_match_organizer(v_match_id)) THEN
    RAISE EXCEPTION 'No puedes cancelar este cupo.' USING ERRCODE = '42501';
  END IF;
  PERFORM private.require_editable(v_match);
  IF v_reg.status = 'cancelled' THEN
    RETURN jsonb_build_object('cancelled_id', v_reg.id, 'promoted_id', NULL, 'already_cancelled', true);
  END IF;
  UPDATE public.registrations SET status = 'cancelled' WHERE id = v_reg.id;
  IF v_reg.status = 'confirmed' THEN
    SELECT id INTO v_promoted FROM public.registrations WHERE match_id = v_match.id AND status = 'waitlist'
      ORDER BY created_at, id LIMIT 1;
    IF v_promoted IS NOT NULL THEN UPDATE public.registrations SET status = 'confirmed' WHERE id = v_promoted; END IF;
  END IF;
  RETURN jsonb_build_object('cancelled_id', v_reg.id, 'promoted_id', v_promoted, 'already_cancelled', false);
END;
$$;

CREATE FUNCTION public.set_match_capacity(p_match_id uuid, p_capacity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_confirmed integer; v_demoted integer := 0; v_promoted integer := 0;
BEGIN
  v_match := private.require_match_organizer(p_match_id);
  PERFORM private.require_editable(v_match);
  IF p_capacity IS NULL OR p_capacity NOT BETWEEN 6 AND 22 OR p_capacity % 2 <> 0 THEN
    RAISE EXCEPTION 'Elige un número par de cupos entre 6 y 22.' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_confirmed FROM public.registrations WHERE match_id = p_match_id AND status = 'confirmed';
  IF v_confirmed > p_capacity THEN
    UPDATE public.registrations SET status = 'waitlist' WHERE id IN (
      SELECT id FROM public.registrations WHERE match_id = p_match_id AND status = 'confirmed'
      ORDER BY created_at DESC, id DESC LIMIT (v_confirmed - p_capacity)
    );
    GET DIAGNOSTICS v_demoted = ROW_COUNT;
  END IF;
  UPDATE public.matches SET capacity = p_capacity WHERE id = p_match_id;
  IF v_confirmed < p_capacity THEN
    UPDATE public.registrations SET status = 'confirmed' WHERE id IN (
      SELECT id FROM public.registrations WHERE match_id = p_match_id AND status = 'waitlist'
      ORDER BY created_at, id LIMIT (p_capacity - v_confirmed)
    );
    GET DIAGNOSTICS v_promoted = ROW_COUNT;
  END IF;
  SELECT count(*) INTO v_confirmed FROM public.registrations WHERE match_id = p_match_id AND status = 'confirmed';
  RETURN jsonb_build_object('new_capacity', p_capacity, 'confirmed_count', v_confirmed,
    'demoted_count', v_demoted, 'promoted_count', v_promoted);
END;
$$;

CREATE OR REPLACE FUNCTION public.reduce_capacity(p_match_id uuid, p_new_capacity integer)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.set_match_capacity(p_match_id, p_new_capacity);
$$;

CREATE FUNCTION public.create_match(p_title text, p_starts_at timestamptz, p_location text,
  p_capacity integer, p_price_per_player numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_attempt integer;
BEGIN
  IF NOT private.is_google_organizer() THEN
    RAISE EXCEPTION 'Inicia sesión con Google para organizar un partido.' USING ERRCODE = '42501';
  END IF;
  FOR v_attempt IN 1..5 LOOP
    BEGIN
      INSERT INTO public.matches (organizer_id, slug, title, starts_at, location, capacity, price_per_player)
      VALUES (auth.uid(), substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
        btrim(p_title), p_starts_at, btrim(p_location), p_capacity, p_price_per_player)
      RETURNING * INTO v_match;
      INSERT INTO public.teams (match_id, name, color, idx)
        VALUES (v_match.id, 'Equipo verde', '#16A34A', 0), (v_match.id, 'Equipo azul', '#2563EB', 1);
      RETURN to_jsonb(v_match) - 'organizer_id';
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 5 THEN RAISE; END IF;
    END;
  END LOOP;
  RAISE EXCEPTION 'No pudimos crear el partido. Inténtalo de nuevo.';
END;
$$;

CREATE FUNCTION public.update_match_details(p_match_id uuid, p_title text, p_starts_at timestamptz,
  p_location text, p_price_per_player numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  v_match := private.require_match_organizer(p_match_id);
  PERFORM private.require_editable(v_match);
  UPDATE public.matches SET title = btrim(p_title), starts_at = p_starts_at, location = btrim(p_location),
    price_per_player = p_price_per_player, revision = revision + 1 WHERE id = p_match_id;
END;
$$;

CREATE FUNCTION public.set_registration_paid(p_registration_id uuid, p_paid boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_match_id uuid;
BEGIN
  SELECT match_id INTO v_match_id FROM public.registrations WHERE id = p_registration_id;
  v_match := private.require_match_organizer(v_match_id);
  PERFORM private.require_editable(v_match);
  IF p_paid IS NULL THEN RAISE EXCEPTION 'Indica si el pago está registrado.' USING ERRCODE = '22023'; END IF;
  UPDATE public.registrations SET paid = p_paid WHERE id = p_registration_id;
END;
$$;

CREATE FUNCTION public.get_my_registration(p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT r.id INTO v_id FROM public.registrations r JOIN public.matches m ON m.id = r.match_id
    WHERE m.slug = p_slug AND r.user_id = auth.uid() AND r.status <> 'cancelled';
  RETURN private.registration_result(v_id);
END;
$$;

CREATE FUNCTION public.get_public_match(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'match', to_jsonb(m) - 'organizer_id' - 'created_at',
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

CREATE FUNCTION public.list_organizer_matches()
RETURNS SETOF public.matches LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.is_google_organizer() THEN RAISE EXCEPTION 'Inicia sesión con Google.' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM public.matches WHERE organizer_id = auth.uid() ORDER BY starts_at DESC, id;
END;
$$;

CREATE FUNCTION public.get_admin_match(p_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT private.is_match_organizer(p_match_id) THEN RAISE EXCEPTION 'No tienes acceso a este partido.' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object('match', to_jsonb(m),
    'registrations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'player_name', r.player_name,
      'position', r.position, 'status', r.status, 'paid', r.paid, 'created_at', r.created_at,
      'skill', COALESCE((SELECT p.skill FROM public.players p WHERE p.organizer_id = auth.uid()
        AND lower(btrim(p.name)) = lower(r.player_name)), 3)) ORDER BY r.created_at, r.id)
      FROM public.registrations r WHERE r.match_id = m.id AND r.status <> 'cancelled'), '[]'::jsonb),
    'teams', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.idx) FROM public.teams t WHERE t.match_id = m.id), '[]'::jsonb),
    'assignments', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.team_assignments a WHERE a.match_id = m.id), '[]'::jsonb))
  INTO v_result FROM public.matches m WHERE m.id = p_match_id;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.save_match_teams(p_match_id uuid, p_teams jsonb, p_assignments jsonb, p_publish boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_total integer; v_inserted integer;
BEGIN
  v_match := private.require_match_organizer(p_match_id);
  PERFORM private.require_editable(v_match);
  IF jsonb_typeof(p_teams) IS DISTINCT FROM 'array' OR jsonb_array_length(p_teams) <> 2
    OR jsonb_typeof(p_assignments) IS DISTINCT FROM 'array' OR p_publish IS NULL THEN
    RAISE EXCEPTION 'Revisa los dos equipos y sus jugadores.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(DISTINCT idx) FROM jsonb_to_recordset(p_teams) AS t(idx integer, name text, color text) WHERE idx IN (0, 1)) <> 2 THEN
    RAISE EXCEPTION 'Necesitas dos equipos diferentes.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.teams (match_id, idx, name, color)
    SELECT p_match_id, idx, btrim(name), color FROM jsonb_to_recordset(p_teams) AS t(idx integer, name text, color text)
    ON CONFLICT (match_id, idx) DO UPDATE SET name = excluded.name, color = excluded.color;
  DELETE FROM public.team_assignments WHERE match_id = p_match_id;
  INSERT INTO public.team_assignments (match_id, registration_id, team_id, pitch_x, pitch_y)
    SELECT p_match_id, a.registration_id, t.id, a.pitch_x, a.pitch_y
    FROM jsonb_to_recordset(p_assignments) AS a(registration_id uuid, team_idx integer, pitch_x float8, pitch_y float8)
    JOIN public.registrations r ON r.id = a.registration_id AND r.match_id = p_match_id AND r.status = 'confirmed'
    JOIN public.teams t ON t.match_id = p_match_id AND t.idx = a.team_idx;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted <> jsonb_array_length(p_assignments) THEN
    RAISE EXCEPTION 'Algunos jugadores ya no están confirmados en este partido.' USING ERRCODE = '23514';
  END IF;
  SELECT count(*) INTO v_total FROM public.registrations WHERE match_id = p_match_id AND status = 'confirmed';
  IF p_publish AND (v_total <> v_match.capacity OR v_inserted <> v_total) THEN
    RAISE EXCEPTION 'Llena los cupos y asigna a todos los confirmados antes de publicar.' USING ERRCODE = '23514';
  END IF;
  UPDATE public.matches SET status = CASE WHEN p_publish THEN 'teams_ready'
    WHEN v_total = capacity THEN 'full' ELSE 'open' END, revision = revision + 1 WHERE id = p_match_id;
END;
$$;

CREATE FUNCTION public.finish_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_match_organizer(p_match_id);
  UPDATE public.matches SET status = 'finished', revision = revision + 1 WHERE id = p_match_id;
END;
$$;
