CREATE OR REPLACE FUNCTION public.delete_my_community()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
  _others int;
BEGIN
  SELECT id INTO _cid FROM public.communities WHERE creator_user_id = auth.uid();
  IF _cid IS NULL THEN
    RAISE EXCEPTION 'You do not own a community';
  END IF;

  SELECT count(*) INTO _others
  FROM public.community_members
  WHERE community_id = _cid AND user_id <> auth.uid();

  IF _others > 0 THEN
    RAISE EXCEPTION 'Remove all members before deleting the community';
  END IF;

  DELETE FROM public.community_invites WHERE community_id = _cid;
  DELETE FROM public.community_members WHERE community_id = _cid;
  DELETE FROM public.communities WHERE id = _cid;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_community() TO authenticated;

CREATE OR REPLACE FUNCTION public.prune_inactive_community_members()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _removed int;
BEGIN
  WITH stale AS (
    SELECT cm.id
    FROM public.community_members cm
    JOIN public.communities c ON c.id = cm.community_id
    WHERE cm.user_id <> c.creator_user_id
      AND cm.joined_at < now() - interval '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.user_id = cm.user_id
          AND o.created_at > now() - interval '30 days'
      )
  )
  DELETE FROM public.community_members cm
  USING stale s
  WHERE cm.id = s.id;

  GET DIAGNOSTICS _removed = ROW_COUNT;
  RETURN _removed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_inactive_community_members() TO authenticated;