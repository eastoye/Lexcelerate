// Airtable API functions (frontend)
import { auth } from './firebase-config.js';

// Save word catalogue to Airtable via backend API
export const saveToAirtable = async (wordCatalogue) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/saveCatalogue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        wordCatalogue: wordCatalogue
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving to Airtable:', error);
    return { success: false, error: error.message };
  }
};

// Load word catalogue from Airtable via backend API
export const loadFromAirtable = async () => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/loadCatalogue?uid=${auth.currentUser.uid}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // No catalogue found, return empty array
        return { success: true, data: [] };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.wordCatalogue || [] };
  } catch (error) {
    console.error('Error loading from Airtable:', error);
    return { success: false, error: error.message };
  }
};