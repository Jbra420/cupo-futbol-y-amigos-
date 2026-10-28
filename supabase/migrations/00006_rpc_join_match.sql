-- =============================================================
-- 00006_rpc_join_match.sql – Inscribir jugador a un partido
-- =============================================================

CREATE OR REPLACE FUNCTION public.join_match(
  p_slug     text,
  p_name     text,
  p_position text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id       uuid;
  v_match_status   text;
  v_capacity       int;
  v_confirmed      int;
  v_reg_id         uuid;
  v_reg_status     text;
  v_waitlist_pos   int;
  v_trimmed_name   text;
BEGIN
  -- 1. Validar posición
  IF p_position NOT IN ('POR','DEF','MED','DEL') THEN
    RAISE EXCEPTION 'Posición inválida';
  END IF;

  -- 2. Validar nombre
  v_trimmed_name := trim(p_name);
  IF v_trimmed_name = '' OR v_trimmed_name IS NULL THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  -- 3. Buscar partido por slug
  SELECT id, status, capacity
    INTO v_match_id, v_match_status, v_capacity
    FROM matches
   WHERE slug = p_slug;

  IF v_match_id IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;

  -- 4. Verificar que no haya terminado
  IF v_match_status = 'finished' THEN
    RAISE EXCEPTION 'Este partido ya terminó';
  END IF;

  -- 5. Bloquear fila del partido para evitar condiciones de carrera
  PERFORM 1 FROM matches WHERE id = v_match_id FOR UPDATE;

  -- 6. Verificar nombre duplicado (no cancelado)
  IF EXISTS (
    SELECT 1
      FROM registrations
     WHERE match_id = v_match_id
       AND lower(player_name) = lower(v_trimmed_name)
       AND status != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Ya hay un jugador con ese nombre en este partido';
  END IF;

  -- 7. Contar confirmados
  SELECT count(*)
    INTO v_confirmed
    FROM registrations
   WHERE match_id = v_match_id
     AND status = 'confirmed';

  -- 8. Determinar estado de la inscripción
  IF v_confirmed < v_capacity THEN
    v_reg_status := 'confirmed';
  ELSE
    v_reg_status := 'waitlist';
  END IF;

  INSERT INTO registrations (match_id, user_id, player_name, position, status)
  VALUES (v_match_id, auth.uid(), v_trimmed_name, p_position, v_reg_status)
  RETURNING id INTO v_reg_id;

  -- 9. Actualizar estado del partido
  IF v_reg_status = 'confirmed' THEN
    v_confirmed := v_confirmed + 1;
  END IF;

  IF v_confirmed >= v_capacity THEN
    UPDATE matches SET status = 'full' WHERE id = v_match_id AND status NOT IN ('teams_ready','finished');
  ELSE
    UPDATE matches SET status = 'open' WHERE id = v_match_id AND status = 'full';
  END IF;

  -- 10. Calcular posición en lista de espera
  IF v_reg_status = 'waitlist' THEN
    SELECT count(*)
      INTO v_waitlist_pos
      FROM registrations
     WHERE match_id = v_match_id
       AND status = 'waitlist'
       AND created_at <= (SELECT created_at FROM registrations WHERE id = v_reg_id);
  END IF;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'status',          v_reg_status,
    'waitlist_position', CASE WHEN v_reg_status = 'waitlist' THEN v_waitlist_pos ELSE NULL END
  );
END;
$$;
