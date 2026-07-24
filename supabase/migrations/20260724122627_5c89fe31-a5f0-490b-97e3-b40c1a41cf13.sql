
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role remains executable by authenticated (needed for RLS policies via SQL)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
