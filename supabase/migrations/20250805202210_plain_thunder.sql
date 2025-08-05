/*
  # Create user_lists table

  1. New Tables
    - `user_lists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_lists` table
    - Add policies for authenticated users to manage their own lists
*/

CREATE TABLE IF NOT EXISTS user_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lists"
  ON user_lists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists"
  ON user_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON user_lists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON user_lists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_lists_updated_at
  BEFORE UPDATE ON user_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();