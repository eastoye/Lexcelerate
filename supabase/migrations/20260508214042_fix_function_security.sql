/*
  # Fix function security issues

  1. Search Path
    - Set search_path to '' on `update_updated_at_column`, `handle_new_user`, and `get_user_by_username_or_email`
    - Prevents search_path manipulation attacks

  2. Execution Privileges
    - Revoke EXECUTE on `handle_new_user` from anon and authenticated (trigger-only function)
    - Revoke EXECUTE on `get_user_by_username_or_email` from anon (only authenticated users need it)

  3. Important Notes
    - `handle_new_user` remains SECURITY DEFINER because it inserts into profiles on behalf of the auth trigger
    - `get_user_by_username_or_email` remains SECURITY DEFINER because it reads from auth.users which is not accessible to authenticated role directly
    - All functions now use fully qualified table references to work with empty search_path
*/

-- Fix update_updated_at_column: set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user: set search_path, use fully qualified references
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$function$;

-- Revoke direct execution on handle_new_user (trigger-only)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;

-- Fix get_user_by_username_or_email: set search_path, use fully qualified references
CREATE OR REPLACE FUNCTION public.get_user_by_username_or_email(identifier text)
RETURNS TABLE(user_id uuid, email text, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- First try to find by username
  RETURN QUERY
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE p.username = identifier
  LIMIT 1;

  -- If no result, try by email
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT au.id, au.email::text, p.username
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE au.email = identifier
    LIMIT 1;
  END IF;
END;
$function$;

-- Revoke execution from anon (only authenticated users should look up usernames)
REVOKE EXECUTE ON FUNCTION public.get_user_by_username_or_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_by_username_or_email(text) FROM public;

-- Explicitly grant to authenticated only
GRANT EXECUTE ON FUNCTION public.get_user_by_username_or_email(text) TO authenticated;
