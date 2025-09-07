/**
 * Supabase API Module
 * 
 * Handles word catalogue data operations with Supabase database.
 * Provides functions for saving and loading user word catalogues.
 */

import { supabase, TABLES } from './supabase-config.js';

/**
 * API result interface
 * @typedef {Object} ApiResult
 * @property {boolean} success - Whether the operation was successful
 * @property {*} data - The returned data if successful
 * @property {string|null} error - Error message if unsuccessful
 */

/**
 * Word catalogue entry interface
 * @typedef {Object} WordEntry
 * @property {string} word - The word itself
 * @property {number} totalAttempts - Total number of practice attempts
 * @property {number} correctFirstTryCount - Number of correct first attempts
 * @property {Object} mistakes - Object mapping incorrect spellings to counts
 * @property {number} nextReview - Timestamp for next review
 * @property {number} interval - Spaced repetition interval
 * @property {number} score - Current word score
 * @property {number} streak - Current correct streak
 */

/**
 * Validates word catalogue data structure
 * @param {Array} wordCatalogue - The word catalogue to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validateWordCatalogue = (wordCatalogue) => {
  if (!Array.isArray(wordCatalogue)) {
    return false;
  }

  return wordCatalogue.every(word => 
    typeof word === 'object' &&
    typeof word.word === 'string' &&
    word.word.trim().length > 0
  );
};

/**
 * Normalizes word catalogue data to ensure all required properties exist
 * @param {Array} wordCatalogue - Raw word catalogue data
 * @returns {Array} Normalized word catalogue
 */
const normalizeWordCatalogue = (wordCatalogue) => {
  if (!Array.isArray(wordCatalogue)) {
    return [];
  }

  return wordCatalogue.map(word => ({
    word: word.word || '',
    totalAttempts: Number(word.totalAttempts) || 0,
    correctFirstTryCount: Number(word.correctFirstTryCount) || 0,
    mistakes: word.mistakes || {},
    nextReview: Number(word.nextReview) || Date.now(),
    interval: Number(word.interval) || 1,
    score: Number(word.score) || 0,
    streak: Number(word.streak) || 0
  }));
};

/**
 * Saves the user's word catalogue to Supabase
 * @param {WordEntry[]} wordCatalogue - Array of word entries to save
 * @returns {Promise<ApiResult>} Result of the save operation
 */
export const saveToSupabase = async (wordCatalogue) => {
  try {
    // Validate input
    if (!validateWordCatalogue(wordCatalogue)) {
      return { 
        success: false, 
        error: 'Invalid word catalogue format',
        data: null
      };
    }

    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'User not authenticated',
        data: null
      };
    }

    // Normalize the data before saving
    const normalizedCatalogue = normalizeWordCatalogue(wordCatalogue);

    // Prepare the data for upsert
    const catalogueData = {
      uid: user.id,
      email: user.email,
      word_catalogue: normalizedCatalogue,
      updated_at: new Date().toISOString()
    };

    // Upsert the word catalogue
    const { data, error } = await supabase
      .from(TABLES.WORD_CATALOGUES)
      .upsert(catalogueData, { onConflict: 'uid' })
      .select()
      .single();

    if (error) {
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }

    return { 
      success: true, 
      error: null,
      data 
    };
  } catch (error) {
    console.error('Error saving word catalogue to Supabase:', error);
    return { 
      success: false, 
      error: error.message,
      data: null
    };
  }
};

/**
 * Loads the user's word catalogue from Supabase
 * @returns {Promise<ApiResult>} Result containing the word catalogue data
 */
export const loadFromSupabase = async () => {
  try {
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'User not authenticated',
        data: []
      };
    }

    // Query the word catalogue
    const { data, error } = await supabase
      .from(TABLES.WORD_CATALOGUES)
      .select('word_catalogue, updated_at')
      .eq('uid', user.id)
      .maybeSingle();

    if (error) {
      return { 
        success: false, 
        error: error.message,
        data: []
      };
    }

    // Return empty array if no data found (first time user)
    if (!data) {
      return { 
        success: true, 
        error: null,
        data: [] 
      };
    }

    // Normalize and return the word catalogue
    const normalizedCatalogue = normalizeWordCatalogue(data.word_catalogue || []);
    
    return { 
      success: true, 
      error: null,
      data: normalizedCatalogue 
    };
  } catch (error) {
    console.error('Error loading word catalogue from Supabase:', error);
    return { 
      success: false, 
      error: error.message,
      data: []
    };
  }
};

/**
 * Deletes the user's word catalogue from Supabase
 * @returns {Promise<ApiResult>} Result of the delete operation
 */
export const deleteFromSupabase = async () => {
  try {
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'User not authenticated',
        data: null
      };
    }

    // Delete the word catalogue
    const { data, error } = await supabase
      .from(TABLES.WORD_CATALOGUES)
      .delete()
      .eq('uid', user.id)
      .select()
      .single();

    if (error) {
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }

    return { 
      success: true, 
      error: null,
      data 
    };
  } catch (error) {
    console.error('Error deleting word catalogue from Supabase:', error);
    return { 
      success: false, 
      error: error.message,
      data: null
    };
  }
};

/**
 * Gets the last update timestamp for the user's word catalogue
 * @returns {Promise<ApiResult>} Result containing the timestamp
 */
export const getLastUpdateTime = async () => {
  try {
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'User not authenticated',
        data: null
      };
    }

    // Query just the updated_at timestamp
    const { data, error } = await supabase
      .from(TABLES.WORD_CATALOGUES)
      .select('updated_at')
      .eq('uid', user.id)
      .maybeSingle();

    if (error) {
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }

    return { 
      success: true, 
      error: null,
      data: data?.updated_at || null 
    };
  } catch (error) {
    console.error('Error getting last update time from Supabase:', error);
    return { 
      success: false, 
      error: error.message,
      data: null
    };
  }
};