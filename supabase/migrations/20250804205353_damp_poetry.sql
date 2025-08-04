/*
  # Create word catalogues table

  1. New Tables
    - `word_catalogues`
      - `id` (uuid, primary key)
      - `uid` (text, user ID from Firebase)
      - `email` (text, user email)
      - `word_catalogue` (jsonb, stores the word data)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `word_catalogues` table
    - Add policy for users to manage their own data
*/

CREATE TABLE IF NOT EXISTS word_catalogues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text NOT NULL UNIQUE,
  email text,
  word_catalogue jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE word_catalogues ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own data
CREATE POLICY "Users can read own catalogue"
  ON word_catalogues
  FOR SELECT
  USING (uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy to allow users to insert their own data
CREATE POLICY "Users can insert own catalogue"
  ON word_catalogues
  FOR INSERT
  WITH CHECK (uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy to allow users to update their own data
CREATE POLICY "Users can update own catalogue"
  ON word_catalogues
  FOR UPDATE
  USING (uid = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy to allow users to delete their own data
CREATE POLICY "Users can delete own catalogue"
  ON word_catalogues
  FOR DELETE
  USING (uid = current_setting('request.jwt.claims', true)::json->>'sub');

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_word_catalogues_updated_at
  BEFORE UPDATE ON word_catalogues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();