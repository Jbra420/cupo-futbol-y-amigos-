-- Prevent a stale editor from silently overwriting another saved lineup.
CREATE FUNCTION public.commit_match_teams(p_match_id uuid, p_teams jsonb, p_assignments jsonb,
  p_publish boolean, p_expected_revision bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  v_match := private.require_match_organizer(p_match_id);
  IF p_expected_revision IS NULL OR p_expected_revision <> v_match.revision THEN
    RAISE EXCEPTION 'El partido cambió. Recarga el borrador antes de guardar.' USING ERRCODE = '40001';
  END IF;
  PERFORM public.save_match_teams(p_match_id, p_teams, p_assignments, p_publish);
END;
$$;
REVOKE ALL ON FUNCTION public.commit_match_teams(uuid, jsonb, jsonb, boolean, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_match_teams(uuid, jsonb, jsonb, boolean, bigint) TO authenticated;
