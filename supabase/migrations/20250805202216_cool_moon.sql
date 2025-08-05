/*
  # Create user_list_words table

  1. New Tables
    - `user_list_words`
      - `id` (uuid, primary key)
      - `list_id` (uuid, foreign key to user_lists)
      - `word` (text, the actual word)
      - `position` (integer, for ordering)
      - `added_at` (timestamp)

  2. Security
    - Enable RLS on `user_list_words` table
    - Add policies for authenticated users to manage words in their own lists
    
  3. Indexes
    - Add index on list_id for performance
    - Add unique constraint on list_id + word to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS user_list_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
  word text NOT NULL,
  position integer DEFAULT 0,
  added_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate words in the same list
ALTER TABLE user_list_words 
ADD CONSTRAINT unique_list_word 
UNIQUE (list_id, word);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_list_words_list_id 
ON user_list_words(list_id);

ALTER TABLE user_list_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read words from own lists"
  ON user_list_words
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_lists 
      WHERE user_lists.id = user_list_words.list_id 
      AND user_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert words to own lists"
  ON user_list_words
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_lists 
      WHERE user_lists.id = user_list_words.list_id 
      AND user_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update words in own lists"
  ON user_list_words
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_lists 
      WHERE user_lists.id = user_list_words.list_id 
      AND user_lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_lists 
      WHERE user_lists.id = user_list_words.list_id 
      AND user_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete words from own lists"
  ON user_list_words
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_lists 
      WHERE user_lists.id = user_list_words.list_id 
      AND user_lists.user_id = auth.uid()
    )
  );