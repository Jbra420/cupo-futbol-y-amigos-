-- Edit a scheduled match, including capacity, as one authorized transaction.
CREATE FUNCTION public.update_match_event(p_match_id uuid, p_title text, p_starts_at timestamptz,
  p_location text, p_capacity integer, p_expected_revision bigint, p_price_per_player numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  v_match := private.require_match_organizer(p_match_id);
  PERFORM private.require_editable(v_match);
  IF p_expected_revision IS NULL OR v_match.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'El partido cambió mientras lo editabas.' USING ERRCODE = 'PT409';
  END IF;
  PERFORM public.update_match_details(p_match_id, p_title, p_starts_at, p_location, p_price_per_player);
  IF p_capacity IS DISTINCT FROM v_match.capacity THEN
    PERFORM public.set_match_capacity(p_match_id, p_capacity);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_match_event(uuid,text,timestamptz,text,integer,bigint,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_event(uuid,text,timestamptz,text,integer,bigint,numeric) TO authenticated;
