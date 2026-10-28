-- =============================================================
-- 00008_rpc_reduce_capacity.sql – Reducir capacidad de un partido
-- =============================================================

CREATE OR REPLACE FUNCTION public.reduce_capacity(
  p_match_id     uuid,
  p_new_capacity int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id   uuid;
  v_old_capacity   int;
  v_confirmed      int;
  v_demoted        int := 0;
  v_excess         int;
  v_rec            record;
BEGIN
  -- 1. Validar nueva capacidad
  IF p_new_capacity < 6 OR p_new_capacity > 22 THEN
    RAISE EXCEPTION 'La capacidad debe estar entre 6 y 22';
  END IF;

  IF p_new_capacity % 2 != 0 THEN
    RAISE EXCEPTION 'La capacidad debe ser un número par';
  END IF;

  -- 2. Verificar que sea el organizador
  SELECT organizer_id, capacity
    INTO v_organizer_id, v_old_capacity
    FROM matches
   WHERE id = p_match_id;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;

  IF auth.uid() != v_organizer_id THEN
    RAISE EXCEPTION 'Solo el organizador puede cambiar la capacidad';
  END IF;

  -- 3. Bloquear fila del partido
  PERFORM 1 FROM matches WHERE id = p_match_id FOR UPDATE;

  -- 4. Contar confirmados
  SELECT count(*)
    INTO v_confirmed
    FROM registrations
   WHERE match_id = p_match_id
     AND status = 'confirmed';

  -- 5. Si la nueva capacidad es menor que los confirmados, mover el exceso a waitlist
  IF p_new_capacity < v_confirmed THEN
    v_excess := v_confirmed - p_new_capacity;

    FOR v_rec IN
      SELECT id
        FROM registrations
       WHERE match_id = p_match_id
         AND status = 'confirmed'
       ORDER BY created_at DESC
       LIMIT v_excess
    LOOP
      UPDATE registrations SET status = 'waitlist' WHERE id = v_rec.id;
      v_demoted := v_demoted + 1;
    END LOOP;

    v_confirmed := p_new_capacity;
  END IF;

  -- 6. Actualizar capacidad
  UPDATE matches SET capacity = p_new_capacity WHERE id = p_match_id;

  -- 7. Actualizar estado
  IF v_confirmed >= p_new_capacity THEN
    UPDATE matches SET status = 'full'
     WHERE id = p_match_id AND status NOT IN ('teams_ready','finished');
  ELSE
    UPDATE matches SET status = 'open'
     WHERE id = p_match_id AND status IN ('full');
  END IF;

  RETURN jsonb_build_object(
    'new_capacity',    p_new_capacity,
    'confirmed_count', v_confirmed,
    'demoted_count',   v_demoted
  );
END;
$$;
