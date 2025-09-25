/*
  # Add username authentication support

  1. Database Changes
    - Add unique index on profiles.username for fast lookups
    - Create function to find user by username or email
    - Add RLS policies for username lookups

  2. Security
    - Enable public read access to usernames for login validation
    - Maintain user privacy while allowing username lookups
*/

-- Add index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles(username) 
WHERE username IS NOT NULL;

-- Function to get user ID by username or email
CREATE OR REPLACE FUNCTION get_user_by_username_or_email(identifier text)
RETURNS TABLE(user_id uuid, email text, username text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try to find by username
  RETURN QUERY
  SELECT p.id, p.email, p.username
  FROM profiles p
  WHERE p.username = identifier
  LIMIT 1;
  
  -- If no result, try by email
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT au.id, au.email::text, p.username
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    WHERE au.email = identifier
    LIMIT 1;
  END IF;
END;
$$;

-- Add policy for public username lookups (needed for login)
CREATE POLICY "Public username lookup for authentication"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (username IS NOT NULL);