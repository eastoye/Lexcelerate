// Airtable integration utilities for secure data storage
import { getCurrentUser } from './auth-utils.js';

// Save word catalogue to Airtable via backend
export async function saveToAirtable(wordCatalogue) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/saveCatalogue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: user.uid,
        wordCatalogue: wordCatalogue,
        lastUpdated: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Word catalogue saved to Airtable successfully');
    return result;
  } catch (error) {
    console.error('Error saving to Airtable:', error);
    throw error;
  }
}

// Load word catalogue from Airtable via backend
export async function loadFromAirtable() {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/loadCatalogue?uid=${user.uid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          wordCatalogue: [],
          lastUpdated: null
        };
      }
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Word catalogue loaded from Airtable successfully');
    return {
      wordCatalogue: result.wordCatalogue || [],
      lastUpdated: result.lastUpdated
    };
  } catch (error) {
    console.error('Error loading from Airtable:', error);
    throw error;
  }
}

// Sync word catalogue with Airtable (with localStorage fallback)
export async function syncWordCatalogueWithAirtable(localWordCatalogue) {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      // Guest user - use localStorage only
      return localWordCatalogue;
    }

    // Try to load from Airtable first
    const airtableData = await loadFromAirtable();
    
    if (airtableData.wordCatalogue.length > 0) {
      // If Airtable has data, use it and update localStorage
      localStorage.setItem('wordCatalogue', JSON.stringify(airtableData.wordCatalogue));
      return airtableData.wordCatalogue;
    } else if (localWordCatalogue.length > 0) {
      // If localStorage has data but Airtable doesn't, upload to Airtable
      await saveToAirtable(localWordCatalogue);
      return localWordCatalogue;
    } else {
      // Both are empty
      return [];
    }
  } catch (error) {
    console.error('Error syncing with Airtable:', error);
    // Fall back to localStorage data
    return localWordCatalogue;
  }
}