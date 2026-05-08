/*
  # Switch get_user_by_username_or_email to SECURITY INVOKER

  1. Changes
    - Replaces SECURITY DEFINER with SECURITY INVOKER
    - Removes auth.users lookup (profiles table already has email)
    - Function now runs with the caller's permissions, relying on existing RLS policy
      "Public username lookup for authentication" which allows anon+authenticated to
      SELECT from profiles where username IS NOT NULL

  2. Security
    - Eliminates privilege escalation risk from SECURITY DEFINER
    - Data access is governed by RLS policies on profiles table
    - Grants EXECUTE to anon (needed for pre-login username lookup) and authenticated
*/

CREATE OR REPLACE FUNCTION public.get_user_by_username_or_email(identifier text)
RETURNS TABLE(user_id uuid, email text, username text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  -- Try by username first
  RETURN QUERY
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE p.username = identifier
  LIMIT 1;

  -- If no result, try by email
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT p.id, p.email, p.username
    FROM public.profiles p
    WHERE p.email = identifier
    LIMIT 1;
  END IF;
END;
$function$;

-- Grant execute to both anon (pre-login lookup) and authenticated
GRANT EXECUTE ON FUNCTION public.get_user_by_username_or_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_by_username_or_email(text) TO authenticated;
