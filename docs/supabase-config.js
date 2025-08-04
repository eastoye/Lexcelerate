// Supabase configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase project credentials
const supabaseUrl = 'https://duqcnphwklfmoklfstze.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWNucGh3a2xmbW9rbGZzdHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMzk2NTksImV4cCI6MjA2OTkxNTY1OX0.P6r1DEWaFPudYFIe5zjMNsPJkhe13WjM_oyfSpW-3Go';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);