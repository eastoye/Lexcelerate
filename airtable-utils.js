// Airtable integration utilities for secure data storage
import { getCurrentUser } from './auth-utils.js';

// Save word catalogue to Airtable via backend
export async function saveToAirtable(wordCatalogue) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log(`Saving catalogue with ${wordCatalogue.length} words for user ${user.uid}`);

    const response = await fetch('/api/saveCatalogue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: user.uid,
        wordCatalogue: wordCatalogue
      })
    });

    const responseText = await response.text();
    console.log('Save response status:', response.status);
    console.log('Save response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: 'Invalid response format', details: responseText };
      }
      
      throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
    }

    const result = JSON.parse(responseText);
    console.log('Word catalogue saved to Airtable successfully:', result);
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

    console.log(`Loading catalogue for user ${user.uid}`);

    const response = await fetch(`/api/loadCatalogue?uid=${encodeURIComponent(user.uid)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const responseText = await response.text();
    console.log('Load response status:', response.status);
    console.log('Load response body:', responseText);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('No catalogue found for user - returning empty catalogue');
        return {
          wordCatalogue: [],
          lastUpdated: null
        };
      }
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: 'Invalid response format', details: responseText };
      }
      
      throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
    }

    const result = JSON.parse(responseText);
    console.log('Word catalogue loaded from Airtable successfully:', {
      wordsCount: result.wordCatalogue?.length || 0,
      lastUpdated: result.lastUpdated
    });
    
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
      console.log('Guest user - using localStorage only');
      return localWordCatalogue;
    }

    console.log('Authenticated user - syncing with Airtable');

    // Try to load from Airtable first
    const airtableData = await loadFromAirtable();
    
    if (airtableData.wordCatalogue.length > 0) {
      // If Airtable has data, use it and update localStorage
      console.log(`Using Airtable data (${airtableData.wordCatalogue.length} words)`);
      localStorage.setItem('wordCatalogue', JSON.stringify(airtableData.wordCatalogue));
      return airtableData.wordCatalogue;
    } else if (localWordCatalogue.length > 0) {
      // If localStorage has data but Airtable doesn't, upload to Airtable
      console.log(`Uploading local data to Airtable (${localWordCatalogue.length} words)`);
      await saveToAirtable(localWordCatalogue);
      return localWordCatalogue;
    } else {
      // Both are empty
      console.log('Both local and cloud catalogues are empty');
      return [];
    }
  } catch (error) {
    console.error('Error syncing with Airtable:', error);
    // Fall back to localStorage data
    console.log('Falling back to localStorage data');
    return localWordCatalogue;
  }
}