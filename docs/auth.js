// Supabase Authentication functions
import { supabase } from './supabase-config.js';

// Create or update user profile
export const createProfile = async (username) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username,
        email: user.email
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get user profile
export const getUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign up function
export const signUp = async (email, password, username) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // If signup successful and we have a username, create profile immediately
    if (data.user && username) {
      const profileResult = await createProfile(username);
      if (!profileResult.success) {
        console.warn('Profile creation failed during signup:', profileResult.error);
      }
    }
    
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign in function - supports both email and username
export const signIn = async (identifier, password) => {
  try {
    let email = identifier;
    
    // Check if identifier is a username (doesn't contain @)
    if (!identifier.includes('@')) {
      // Look up email by username
      const { data: userData, error: lookupError } = await supabase
        .rpc('get_user_by_username_or_email', { identifier: identifier });
      
      if (lookupError) {
        return { success: false, error: 'Username not found' };
      }
      
      if (!userData || userData.length === 0) {
        return { success: false, error: 'Username not found' };
      }
      
      email = userData[0].email;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign out function
export const logOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};