// User Lists API functions
import { supabase } from './supabase-config.js';

// Check if we're in guest mode
function isGuestMode() {
  return window.isGuestMode || localStorage.getItem('lexcelerate_guest_mode') === 'true';
}

// Guest mode localStorage functions
function getGuestLists() {
  try {
    const lists = localStorage.getItem('lexcelerate_guest_lists');
    return lists ? JSON.parse(lists) : [];
  } catch (error) {
    console.error('Error loading guest lists:', error);
    return [];
  }
}

function saveGuestLists(lists) {
  try {
    localStorage.setItem('lexcelerate_guest_lists', JSON.stringify(lists));
  } catch (error) {
    console.error('Error saving guest lists:', error);
  }
}

function getGuestListWords(listId) {
  try {
    const words = localStorage.getItem(`lexcelerate_guest_list_words_${listId}`);
    return words ? JSON.parse(words) : [];
  } catch (error) {
    console.error('Error loading guest list words:', error);
    return [];
  }
}

function saveGuestListWords(listId, words) {
  try {
    localStorage.setItem(`lexcelerate_guest_list_words_${listId}`, JSON.stringify(words));
  } catch (error) {
    console.error('Error saving guest list words:', error);
  }
}

function generateGuestId() {
  return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get all user lists
export const getUserLists = async () => {
  if (isGuestMode()) {
    const lists = getGuestLists();
    return { success: true, data: lists };
  }
  
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
  if (isGuestMode()) {
    const lists = getGuestLists();
    const newList = {
      id: generateGuestId(),
      user_id: 'guest',
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    lists.push(newList);
    saveGuestLists(lists);
    return { success: true, data: newList };
  }
  
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
  if (isGuestMode()) {
    const lists = getGuestLists();
    const listIndex = lists.findIndex(list => list.id === listId);
    if (listIndex === -1) {
      return { success: false, error: 'List not found', status: 404 };
    }
    lists[listIndex].name = name.trim();
    lists[listIndex].updated_at = new Date().toISOString();
    saveGuestLists(lists);
    return { success: true, data: lists[listIndex] };
  }
  
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
  if (isGuestMode()) {
    const lists = getGuestLists();
    const listIndex = lists.findIndex(list => list.id === listId);
    if (listIndex === -1) {
      return { success: false, error: 'List not found', status: 404 };
    }
    const deletedList = lists.splice(listIndex, 1)[0];
    saveGuestLists(lists);
    // Also remove the words for this list
    localStorage.removeItem(`lexcelerate_guest_list_words_${listId}`);
    return { success: true, data: deletedList };
  }
  
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
  if (isGuestMode()) {
    const words = getGuestListWords(listId);
    return { success: true, data: words };
  }
  
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
  if (isGuestMode()) {
    const words = getGuestListWords(listId);
    
    // Check if word already exists
    if (words.find(w => w.word.toLowerCase() === word.toLowerCase())) {
      return { success: false, error: 'Word already exists in this list', status: 409 };
    }
    
    const newWord = {
      id: generateGuestId(),
      list_id: listId,
      word: word.trim(),
      position: words.length,
      added_at: new Date().toISOString()
    };
    
    words.push(newWord);
    saveGuestListWords(listId, words);
    return { success: true, data: newWord };
  }
  
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
  if (isGuestMode()) {
    const words = getGuestListWords(listId);
    const wordIndex = words.findIndex(w => w.id === wordId);
    if (wordIndex === -1) {
      return { success: false, error: 'Word not found in list', status: 404 };
    }
    const deletedWord = words.splice(wordIndex, 1)[0];
    saveGuestListWords(listId, words);
    return { success: true, data: deletedWord };
  }
  
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