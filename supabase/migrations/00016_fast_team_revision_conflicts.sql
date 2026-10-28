-- A stale editor is an application conflict, not a retryable serialization failure.
-- PostgREST retries SQLSTATE 40001; PT409 returns the intended conflict immediately.
CREATE OR REPLACE FUNCTION public.commit_match_teams(p_match_id uuid, p_teams jsonb, p_assignments jsonb,
  p_publish boolean, p_expected_revision bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches;
BEGIN
  v_match := private.require_match_organizer(p_match_id);
  IF p_expected_revision IS NULL OR p_expected_revision <> v_match.revision THEN
    RAISE EXCEPTION 'El partido cambió. Recarga el borrador antes de guardar.' USING ERRCODE = 'PT409';
  END IF;
  PERFORM public.save_match_teams(p_match_id, p_teams, p_assignments, p_publish);
END;
$$;
