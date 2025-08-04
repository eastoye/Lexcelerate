// Supabase API functions
import { supabase } from './supabase-config.js';
import { auth } from './firebase-config.js';

// Save word catalogue to Supabase
export const saveToSupabase = async (wordCatalogue) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('word_catalogues')
      .upsert({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        word_catalogue: wordCatalogue,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'uid'
      });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return { success: false, error: error.message };
  }
};

// Load word catalogue from Supabase
export const loadFromSupabase = async () => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('word_catalogues')
      .select('word_catalogue, updated_at')
      .eq('uid', auth.currentUser.uid);

    if (error) {
      throw error;
    }

    // If no data found, return empty array
    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    return { success: true, data: data[0].word_catalogue || [] };
  } catch (error) {
    console.error('Error loading from Supabase:', error);
    return { success: false, error: error.message };
  }
};