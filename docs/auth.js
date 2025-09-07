/**
 * Authentication Module
 * 
 * Handles user authentication operations including sign up, sign in,
 * sign out, and profile management using Supabase Auth.
 */

import { supabase, TABLES } from './supabase-config.js';

/**
 * Authentication result interface
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether the operation was successful
 * @property {Object|null} user - User object if successful
 * @property {Object|null} data - Additional data if applicable
 * @property {string|null} error - Error message if unsuccessful
 */

/**
 * Profile data interface
 * @typedef {Object} ProfileData
 * @property {string} id - User ID
 * @property {string} username - User's chosen username
 * @property {string} email - User's email address
 * @property {string} created_at - Profile creation timestamp
 * @property {string} updated_at - Profile last update timestamp
 */

/**
 * Creates or updates a user profile in the database
 * @param {string} username - The username to set for the user
 * @returns {Promise<AuthResult>} Result of the profile creation/update operation
 */
export const createProfile = async (username) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'User not authenticated',
        user: null,
        data: null
      };
    }

    const profileData = {
      id: user.id,
      username: username.trim(),
      email: user.email
    };

    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      return { 
        success: false, 
        error: error.message,
        user: null,
        data: null
      };
    }

    return { 
      success: true, 
      error: null,
      user,
      data 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      user: null,
      data: null
    };
  }
};

/**
 * Retrieves the current user's profile from the database
 * @returns {Promise<AuthResult>} Result containing the user profile data
 */
export const getUserProfile = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        error: 'User not authenticated',
        user: null,
        data: null
      };
    }

    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return { 
        success: false, 
        error: error.message,
        user: null,
        data: null
      };
    }

    return { 
      success: true, 
      error: null,
      user,
      data 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      user: null,
      data: null
    };
  }
};

/**
 * Registers a new user account
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<AuthResult>} Result of the sign up operation
 */
export const signUp = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
    });
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        user: null,
        data: null
      };
    }
    
    return { 
      success: true, 
      error: null,
      user: data.user,
      data
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      user: null,
      data: null
    };
  }
};

/**
 * Signs in an existing user
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<AuthResult>} Result of the sign in operation
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        user: null,
        data: null
      };
    }
    
    return { 
      success: true, 
      error: null,
      user: data.user,
      data
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      user: null,
      data: null
    };
  }
};

/**
 * Signs out the current user
 * @returns {Promise<AuthResult>} Result of the sign out operation
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        user: null,
        data: null
      };
    }
    
    return { 
      success: true, 
      error: null,
      user: null,
      data: null
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      user: null,
      data: null
    };
  }
};

/**
 * Sets up an authentication state change listener
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    callback(user, event, session);
  });
};

/**
 * Gets the current authenticated user
 * @returns {Promise<AuthResult>} Result containing current user data
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        user: null,
        data: null
      };
    }
    
    return { 
      success: true, 
      error: null,
      user,
      data: { user }
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      user: null,
      data: null
    };
  }
};