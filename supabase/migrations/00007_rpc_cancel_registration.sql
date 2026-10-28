-- =============================================================
-- 00007_rpc_cancel_registration.sql – Cancelar inscripción
-- =============================================================

CREATE OR REPLACE FUNCTION public.cancel_registration(
  p_registration_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg            record;
  v_match_id       uuid;
  v_organizer_id   uuid;
  v_capacity       int;
  v_promoted_id    uuid;
  v_confirmed      int;
BEGIN
  -- 1. Buscar la inscripción
  SELECT r.id, r.user_id, r.status, r.match_id
    INTO v_reg
    FROM registrations r
   WHERE r.id = p_registration_id;

  IF v_reg IS NULL THEN
    RAISE EXCEPTION 'Inscripción no encontrada';
  END IF;

  -- 2. Verificar permisos
  SELECT organizer_id
    INTO v_organizer_id
    FROM matches
   WHERE id = v_reg.match_id;

  IF auth.uid() != v_reg.user_id AND auth.uid() != v_organizer_id THEN
    RAISE EXCEPTION 'No tenés permiso para cancelar esta inscripción';
  END IF;

  -- 3. Verificar que no esté ya cancelada
  IF v_reg.status = 'cancelled' THEN
    RAISE EXCEPTION 'Esta inscripción ya fue cancelada';
  END IF;

  -- 4. Bloquear fila del partido
  SELECT id, capacity
    INTO v_match_id, v_capacity
    FROM matches
   WHERE id = v_reg.match_id
     FOR UPDATE;

  -- 5. Cancelar
  UPDATE registrations SET status = 'cancelled' WHERE id = p_registration_id;

  -- 6. Si era confirmado, promover al primer waitlist
  IF v_reg.status = 'confirmed' THEN
    SELECT id INTO v_promoted_id
      FROM registrations
     WHERE match_id = v_match_id
       AND status = 'waitlist'
     ORDER BY created_at ASC
     LIMIT 1;

    IF v_promoted_id IS NOT NULL THEN
      UPDATE registrations SET status = 'confirmed' WHERE id = v_promoted_id;
    END IF;
  END IF;

  -- 7. Recontar y actualizar estado
  SELECT count(*)
    INTO v_confirmed
    FROM registrations
   WHERE match_id = v_match_id
     AND status = 'confirmed';

  IF v_confirmed >= v_capacity THEN
    UPDATE matches SET status = 'full'
     WHERE id = v_match_id AND status NOT IN ('teams_ready','finished');
  ELSIF v_confirmed < v_capacity THEN
    UPDATE matches SET status = 'open'
     WHERE id = v_match_id AND status IN ('full');
  END IF;

  RETURN jsonb_build_object(
    'cancelled_id', p_registration_id,
    'promoted_id',  v_promoted_id
  );
END;
$$;
