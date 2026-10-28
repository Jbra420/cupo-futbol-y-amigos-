-- =============================================================
-- 00009_triggers_status.sql – Trigger para sincronizar matches.status
-- =============================================================

CREATE OR REPLACE FUNCTION public.update_match_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id     uuid;
  v_capacity     int;
  v_confirmed    int;
  v_cur_status   text;
BEGIN
  -- Determinar el match_id afectado
  v_match_id := COALESCE(NEW.match_id, OLD.match_id);

  -- Obtener datos actuales del partido
  SELECT capacity, status
    INTO v_capacity, v_cur_status
    FROM matches
   WHERE id = v_match_id;

  -- No modificar estados terminales
  IF v_cur_status IN ('teams_ready', 'finished') THEN
    RETURN NULL;
  END IF;

  -- Contar confirmados
  SELECT count(*)
    INTO v_confirmed
    FROM registrations
   WHERE match_id = v_match_id
     AND status = 'confirmed';

  -- Actualizar estado del partido según conteo
  IF v_confirmed >= v_capacity THEN
    UPDATE matches SET status = 'full' WHERE id = v_match_id AND status != 'full';
  ELSE
    UPDATE matches SET status = 'open' WHERE id = v_match_id AND status = 'full';
  END IF;

  RETURN NULL;
END;
$$;

-- El trigger se dispara después de insertar o actualizar el campo status
-- en registrations.
DROP TRIGGER IF EXISTS trg_update_match_status ON public.registrations;

CREATE TRIGGER trg_update_match_status
  AFTER INSERT OR UPDATE OF status
  ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_status();
