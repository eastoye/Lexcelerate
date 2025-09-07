/**
 * Supabase Configuration
 * 
 * This module initializes and exports the Supabase client instance
 * for use throughout the application.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase project configuration
const SUPABASE_CONFIG = {
  url: 'https://duqcnphwklfmoklfstze.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cWNucGh3a2xmbW9rbGZzdHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMzk2NTksImV4cCI6MjA2OTkxNTY1OX0.P6r1DEWaFPudYFIe5zjMNsPJkhe13WjM_oyfSpW-3Go'
};

/**
 * Supabase client instance
 * Configured with project URL and anonymous key for client-side operations
 */
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

/**
 * Database table names
 * Centralized constants for database table references
 */
export const TABLES = {
  WORD_CATALOGUES: 'word_catalogues',
  PROFILES: 'profiles',
  USER_LISTS: 'user_lists',
  USER_LIST_WORDS: 'user_list_words'
};

/**
 * Authentication event types
 * Constants for Supabase auth state changes
 */
export const AUTH_EVENTS = {
  SIGNED_IN: 'SIGNED_IN',
  SIGNED_OUT: 'SIGNED_OUT',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  USER_UPDATED: 'USER_UPDATED',
  PASSWORD_RECOVERY: 'PASSWORD_RECOVERY'
};