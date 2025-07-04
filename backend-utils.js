// Backend integration utilities for secure API handling
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || '/api'; // Your backend API endpoint

// Save word catalogue to backend
export async function saveWordCatalogueToBackend(wordCatalogue, userUid) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/word-catalogue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        uid: userUid,
        data: wordCatalogue,
        updated: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Word catalogue saved to backend successfully');
    return result;
  } catch (error) {
    console.error('Error saving to backend:', error);
    throw error;
  }
}

// Load word catalogue from backend
export async function loadWordCatalogueFromBackend(userUid) {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/word-catalogue/${userUid}`, {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`
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
    console.log('Word catalogue loaded from backend successfully');
    return {
      wordCatalogue: result.data || [],
      lastUpdated: result.updated
    };
  } catch (error) {
    console.error('Error loading from backend:', error);
    throw error;
  }
}

// Sync word catalogue with backend (with localStorage fallback)
export async function syncWordCatalogueWithBackend(localWordCatalogue, userUid) {
  try {
    if (!userUid) {
      // Guest user - use localStorage only
      return localWordCatalogue;
    }

    // Try to load from backend first
    const backendData = await loadWordCatalogueFromBackend(userUid);
    
    if (backendData.wordCatalogue.length > 0) {
      // If backend has data, use it and update localStorage
      localStorage.setItem('wordCatalogue', JSON.stringify(backendData.wordCatalogue));
      return backendData.wordCatalogue;
    } else if (localWordCatalogue.length > 0) {
      // If localStorage has data but backend doesn't, upload to backend
      await saveWordCatalogueToBackend(localWordCatalogue, userUid);
      return localWordCatalogue;
    } else {
      // Both are empty
      return [];
    }
  } catch (error) {
    console.error('Error syncing with backend:', error);
    // Fall back to localStorage data
    return localWordCatalogue;
  }
}

// Get Firebase auth token for backend authentication
async function getAuthToken() {
  // Import Firebase auth
  const { getCurrentUser } = await import('./auth-utils.js');
  const user = getCurrentUser();
  
  if (user) {
    return await user.getIdToken();
  }
  
  throw new Error('User not authenticated');
}