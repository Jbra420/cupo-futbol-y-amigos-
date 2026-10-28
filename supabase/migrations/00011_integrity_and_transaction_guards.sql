-- Additive hardening: keep the initial migrations intact.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

ALTER TABLE public.matches ADD COLUMN revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_title_valid CHECK (length(btrim(title)) BETWEEN 1 AND 100),
  ADD CONSTRAINT matches_location_valid CHECK (length(btrim(location)) BETWEEN 1 AND 200),
  ADD CONSTRAINT matches_price_valid CHECK (price_per_player IS NULL OR price_per_player >= 0);

ALTER TABLE public.registrations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_name_valid CHECK (
    length(player_name) BETWEEN 1 AND 60 AND player_name = btrim(player_name)
  ),
  ADD CONSTRAINT registrations_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id);
CREATE UNIQUE INDEX registrations_one_active_user
  ON public.registrations (match_id, user_id)
  WHERE user_id IS NOT NULL AND status <> 'cancelled';
CREATE INDEX registrations_queue ON public.registrations (match_id, status, created_at, id);
CREATE INDEX matches_organizer_start ON public.matches (organizer_id, starts_at DESC);

ALTER TABLE public.players
  ADD CONSTRAINT players_name_valid CHECK (length(btrim(name)) BETWEEN 1 AND 60);
ALTER TABLE public.teams
  ADD CONSTRAINT teams_name_valid CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  ADD CONSTRAINT teams_color_valid CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT teams_id_match_unique UNIQUE (id, match_id);
ALTER TABLE public.registrations ADD CONSTRAINT registrations_id_match_unique UNIQUE (id, match_id);

ALTER TABLE public.team_assignments ADD COLUMN match_id uuid;
UPDATE public.team_assignments a SET match_id = t.match_id FROM public.teams t WHERE t.id = a.team_id;
ALTER TABLE public.team_assignments ALTER COLUMN match_id SET NOT NULL;
ALTER TABLE public.team_assignments
  ADD CONSTRAINT assignments_registration_match_fk FOREIGN KEY (registration_id, match_id)
    REFERENCES public.registrations(id, match_id) ON DELETE CASCADE,
  ADD CONSTRAINT assignments_team_match_fk FOREIGN KEY (team_id, match_id)
    REFERENCES public.teams(id, match_id) ON DELETE CASCADE;
CREATE INDEX assignments_match ON public.team_assignments (match_id);

CREATE FUNCTION private.is_google_organizer() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users u JOIN auth.identities i ON i.user_id = u.id
    WHERE u.id = auth.uid() AND u.is_anonymous IS FALSE AND i.provider = 'google'
  );
$$;

CREATE FUNCTION private.is_match_organizer(p_match_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.is_google_organizer() AND EXISTS (
    SELECT 1 FROM public.matches WHERE id = p_match_id AND organizer_id = auth.uid()
  );
$$;

CREATE FUNCTION private.can_read_lineup(p_match_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.is_match_organizer(p_match_id) OR EXISTS (
    SELECT 1 FROM public.matches WHERE id = p_match_id AND status IN ('teams_ready', 'finished')
  );
$$;

CREATE FUNCTION private.require_match_organizer(p_match_id uuid) RETURNS public.matches
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_google_organizer() THEN
    RAISE EXCEPTION 'Necesitas iniciar sesión con Google.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND OR v_match.organizer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No tienes acceso a este partido.' USING ERRCODE = '42501';
  END IF;
  RETURN v_match;
END;
$$;

CREATE FUNCTION private.require_editable(p_match public.matches) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF p_match.status = 'finished' THEN
    RAISE EXCEPTION 'Este partido ya terminó.' USING ERRCODE = '22023';
  END IF;
END;
$$;

DROP TRIGGER trg_update_match_status ON public.registrations;

-- A defensive trigger also protects privileged maintenance writes from overbooking.
CREATE FUNCTION private.guard_registration() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_match_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_match_id := OLD.match_id; ELSE v_match_id := NEW.match_id; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.match_id IS DISTINCT FROM OLD.match_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'La identidad de una inscripción no se puede cambiar.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = v_match_id FOR UPDATE;
  IF FOUND THEN
    PERFORM private.require_editable(v_match);
    IF TG_OP <> 'DELETE' AND NEW.status = 'confirmed' THEN
      IF TG_OP = 'INSERT' OR OLD.status <> 'confirmed' THEN
        IF (SELECT count(*) FROM public.registrations WHERE match_id = v_match_id AND status = 'confirmed') >= v_match.capacity THEN
          RAISE EXCEPTION 'No quedan cupos disponibles.' USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_registration BEFORE INSERT OR UPDATE OR DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION private.guard_registration();

CREATE FUNCTION private.refresh_roster() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match_id uuid; v_changed boolean; v_registration_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_match_id := NEW.match_id; v_registration_id := NEW.id; v_changed := NEW.status = 'confirmed';
  ELSIF TG_OP = 'DELETE' THEN
    v_match_id := OLD.match_id; v_registration_id := OLD.id; v_changed := OLD.status = 'confirmed';
  ELSE
    v_match_id := NEW.match_id; v_registration_id := NEW.id;
    v_changed := (OLD.status = 'confirmed') IS DISTINCT FROM (NEW.status = 'confirmed');
  END IF;
  IF TG_OP = 'DELETE' OR NEW.status <> 'confirmed' THEN
    DELETE FROM public.team_assignments WHERE registration_id = v_registration_id;
  END IF;
  UPDATE public.matches m SET
    revision = revision + 1,
    status = CASE
      WHEN m.status = 'finished' THEN m.status
      WHEN m.status = 'teams_ready' AND NOT v_changed THEN m.status
      WHEN (SELECT count(*) FROM public.registrations r WHERE r.match_id = m.id AND r.status = 'confirmed') >= m.capacity THEN 'full'
      ELSE 'open' END
  WHERE m.id = v_match_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER refresh_roster AFTER INSERT OR UPDATE OR DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION private.refresh_roster();

CREATE FUNCTION private.guard_match() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organizer_id IS DISTINCT FROM OLD.organizer_id
    OR NEW.slug IS DISTINCT FROM OLD.slug OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'La identidad del partido no se puede cambiar.' USING ERRCODE = '22023';
  END IF;
  IF NEW.capacity IS DISTINCT FROM OLD.capacity THEN
    PERFORM private.require_editable(OLD);
    IF NEW.capacity < (SELECT count(*) FROM public.registrations WHERE match_id = OLD.id AND status = 'confirmed') THEN
      RAISE EXCEPTION 'Confirma el cambio de cupos mediante la operación autorizada.' USING ERRCODE = '23514';
    END IF;
    NEW.status := CASE WHEN NEW.capacity = (SELECT count(*) FROM public.registrations WHERE match_id = OLD.id AND status = 'confirmed') THEN 'full' ELSE 'open' END;
    NEW.revision := OLD.revision + 1;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_match BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION private.guard_match();

CREATE FUNCTION private.guard_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = NEW.match_id FOR UPDATE;
  PERFORM private.require_editable(v_match);
  IF NOT EXISTS (SELECT 1 FROM public.registrations WHERE id = NEW.registration_id
    AND match_id = NEW.match_id AND status = 'confirmed') THEN
    RAISE EXCEPTION 'Solo se pueden asignar jugadores confirmados del partido.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_assignment BEFORE INSERT OR UPDATE ON public.team_assignments
  FOR EACH ROW EXECUTE FUNCTION private.guard_assignment();

-- A safe revision event covers deletions as well as private changes (e.g. payment).
CREATE FUNCTION private.touch_match() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_match_id := OLD.match_id; ELSE v_match_id := NEW.match_id; END IF;
  UPDATE public.matches SET revision = revision + 1 WHERE id = v_match_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER teams_touch_match AFTER INSERT OR UPDATE OR DELETE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION private.touch_match();
CREATE TRIGGER assignments_touch_match AFTER INSERT OR UPDATE OR DELETE ON public.team_assignments
  FOR EACH ROW EXECUTE FUNCTION private.touch_match();
