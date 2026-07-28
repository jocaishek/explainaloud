-- Supabase grants Data API function execution to `anon` through its platform
-- defaults. The admin RPCs perform their own identity checks, but anonymous
-- clients should not be able to invoke or enumerate this surface at all.

revoke all on function public.is_ropes_admin() from anon;
revoke all on function public.admin_user_overview() from anon;
