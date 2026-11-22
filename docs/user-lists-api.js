// User Lists API functions
import { supabase } from './supabase-config.js';

// Get all user lists
export const getUserLists = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated', status: 401 };
    }

    const { data, error } = await supabase
      .from('user_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, status: 500 };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, status: 500 };
  }
};

// Create a new user list
export const createUserList = async (name) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated', status: 401 };
    }

    const { data, error } = await supabase
      .from('user_lists')
      .insert({
        user_id: user.id,
        name: name.trim()
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, status: 500 };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, status: 500 };
  }
};

// Update a user list
export const updateUserList = async (listId, name) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated', status: 401 };
    }

    const { data, error } = await supabase
      .from('user_lists')
      .update({ 
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', listId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, status: 500 };
    }

    if (!data) {
      return { success: false, error: 'List not found or not owned by user', status: 404 };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, status: 500 };
  }
};

// Delete a user list
export const deleteUserList = async (listId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated', status: 401 };
    }

    const { data, error } = await supabase
      .from('user_lists')
      .delete()
      .eq('id', listId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, status: 500 };
    }

    if (!data) {
      return { success: false, error: 'List not found or not owned by user', status: 404 };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, status: 500 };
  }
};

// Get words in a user list
export const getListWords = async (listId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated', status: 401 };
    }

    // First verify the list belongs to the user
    const { data: listData, error: listError } = await supabase
      .from('user_lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listError || !listData) {
      return { success: false, error: 'List not found or not owned by user', status: 404 };
    }

    const { data, error } = await supabase
      .from('user_list_words')
      .select('*')
      .eq('list_id', listId)
      .order('position', { ascending: true })
      .order('added_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message, status: 500 };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, status: 500 };
  }
};

// Add word to a user list
export const addWordToList = async (listId, word) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated', status: 401 };
    }

    // First verify the list belongs to the user
    const { data: listData, error: listError } = await supabase
      .from('user_lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listError || !listData) {
      return { success: false, error: 'List not found or not owned by user', status: 404 };
    }

    // Get the next position
    const { data: positionData } = await supabase
      .from('user_list_words')
      .select('position')
      .eq('list_id', listId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = positionData && positionData.length > 0 
      ? positionData[0].position + 1 
      : 0;

    const { data, error } = await supabase
      .from('user_list_words')
      .insert({
        list_id: listId,
        word: word.trim(),
        position: nextPosition
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Word already exists in this list', status: 409 };
      }
      return { success: false, error: error.message, status: 500 };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, status: 500 };
  }
};

// Remove word from a user list
export const removeWordFromList = async (listId, wordId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated', status: 401 };
    }

    // First verify the list belongs to the user
    const { data: listData, error: listError } = await supabase
      .from('user_lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listError || !listData) {
      return { success: false, error: 'List not found or not owned by user', status: 404 };
    }

    const { data, error } = await supabase
      .from('user_list_words')
      .delete()
      .eq('id', wordId)
      .eq('list_id', listId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, status: 500 };
    }

    if (!data) {
      return { success: false, error: 'Word not found in list', status: 404 };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, status: 500 };
  }
};