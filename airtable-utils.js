// Airtable integration utilities
const AIRTABLE_BASE_ID = 'YOUR_AIRTABLE_BASE_ID'; // Replace with your Airtable base ID
const AIRTABLE_TABLE_NAME = 'WordCatalogues';

// Get Airtable API key from environment or prompt user to set it
function getAirtableApiKey() {
  // In production, this should come from a secure environment variable
  // For now, we'll use a placeholder that needs to be replaced
  const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
  if (!apiKey) {
    console.warn('Airtable API key not configured. Please set VITE_AIRTABLE_API_KEY environment variable.');
    return null;
  }
  return apiKey;
}

// Save word catalogue to Airtable
export async function saveWordCatalogueToAirtable(wordCatalogue, userUid) {
  const apiKey = getAirtableApiKey();
  if (!apiKey) {
    throw new Error('Airtable API key not configured');
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
    
    // First, check if a record already exists for this user
    const existingRecord = await loadWordCatalogueFromAirtable(userUid);
    
    const data = {
      fields: {
        uid: userUid,
        data: JSON.stringify(wordCatalogue),
        updated: new Date().toISOString()
      }
    };

    let response;
    if (existingRecord && existingRecord.recordId) {
      // Update existing record
      response = await fetch(`${url}/${existingRecord.recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } else {
      // Create new record
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    }

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Word catalogue saved to Airtable successfully');
    return result;
  } catch (error) {
    console.error('Error saving to Airtable:', error);
    throw error;
  }
}

// Load word catalogue from Airtable
export async function loadWordCatalogueFromAirtable(userUid) {
  const apiKey = getAirtableApiKey();
  if (!apiKey) {
    throw new Error('Airtable API key not configured');
  }

  try {
    const filterFormula = encodeURIComponent(`uid="${userUid}"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${filterFormula}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.records && result.records.length > 0) {
      const record = result.records[0];
      const wordCatalogue = JSON.parse(record.fields.data || '[]');
      console.log('Word catalogue loaded from Airtable successfully');
      return {
        wordCatalogue,
        recordId: record.id,
        lastUpdated: record.fields.updated
      };
    } else {
      console.log('No word catalogue found in Airtable for this user');
      return {
        wordCatalogue: [],
        recordId: null,
        lastUpdated: null
      };
    }
  } catch (error) {
    console.error('Error loading from Airtable:', error);
    throw error;
  }
}

// Sync word catalogue with Airtable (with localStorage fallback)
export async function syncWordCatalogueWithAirtable(localWordCatalogue, userUid) {
  try {
    if (!userUid) {
      // Guest user - use localStorage only
      return localWordCatalogue;
    }

    // Try to load from Airtable first
    const airtableData = await loadWordCatalogueFromAirtable(userUid);
    
    if (airtableData.wordCatalogue.length > 0) {
      // If Airtable has data, use it and update localStorage
      localStorage.setItem('wordCatalogue', JSON.stringify(airtableData.wordCatalogue));
      return airtableData.wordCatalogue;
    } else if (localWordCatalogue.length > 0) {
      // If localStorage has data but Airtable doesn't, upload to Airtable
      await saveWordCatalogueToAirtable(localWordCatalogue, userUid);
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