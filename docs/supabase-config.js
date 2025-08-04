// Supabase configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// These will be set when you connect to Supabase
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);