-- A single provisioned account administers the application. No self-registration of admins.
CREATE TABLE private.app_administrator (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton IS TRUE),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.app_administrator ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.app_administrator FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.is_administrator() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM private.app_administrator a JOIN auth.users u ON u.id = a.user_id
    WHERE a.singleton IS TRUE AND a.user_id = auth.uid() AND u.is_anonymous IS FALSE
  );
$$;
REVOKE ALL ON FUNCTION private.is_administrator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_administrator() TO authenticated;

-- Compatibility for the policies/RPCs from older migrations; Google no longer grants access.
CREATE OR REPLACE FUNCTION private.is_google_organizer() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.is_administrator();
$$;
CREATE FUNCTION public.is_app_administrator() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.is_administrator();
$$;
REVOKE ALL ON FUNCTION public.is_app_administrator() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_administrator() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_match(p_title text, p_starts_at timestamptz, p_location text,
  p_capacity integer, p_price_per_player numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_attempt integer;
BEGIN
  IF NOT private.is_administrator() THEN
    RAISE EXCEPTION 'Solo el administrador puede crear partidos.' USING ERRCODE = '42501';
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

-- The sole administrator may also manage events scheduled before this access model.
CREATE OR REPLACE FUNCTION private.is_match_organizer(p_match_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.is_administrator() AND EXISTS (SELECT 1 FROM public.matches WHERE id = p_match_id);
$$;
CREATE OR REPLACE FUNCTION private.require_match_organizer(p_match_id uuid) RETURNS public.matches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  IF NOT private.is_administrator() THEN
    RAISE EXCEPTION 'Solo el administrador puede gestionar los partidos.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontramos el partido.' USING ERRCODE = '42501'; END IF;
  RETURN v_match;
END;
$$;
CREATE OR REPLACE FUNCTION public.list_organizer_matches()
RETURNS SETOF public.matches LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.is_administrator() THEN RAISE EXCEPTION 'Acceso reservado al administrador.' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM public.matches ORDER BY starts_at DESC, id;
END;
$$;
