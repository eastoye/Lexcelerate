import { db } from './firebase.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
  WORD_CATALOGUES: 'wordCatalogues',
  RANDOM_TRIALS: 'randomTrials'
};

// User ID helper (you can replace this with actual user authentication later)
function getUserId() {
  // For now, use a simple identifier stored in localStorage
  let userId = localStorage.getItem('lexcelerate_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('lexcelerate_user_id', userId);
  }
  return userId;
}

// Word Catalogue Functions
export async function saveWordCatalogueToFirestore(wordCatalogue) {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.WORD_CATALOGUES, userId);
    
    await setDoc(docRef, {
      words: wordCatalogue,
      lastUpdated: serverTimestamp(),
      userId: userId
    }, { merge: true });
    
    console.log('Word catalogue saved to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving word catalogue to Firestore:', error);
    return false;
  }
}

export async function loadWordCatalogueFromFirestore() {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.WORD_CATALOGUES, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Word catalogue loaded from Firestore');
      return data.words || [];
    } else {
      console.log('No word catalogue found in Firestore');
      return [];
    }
  } catch (error) {
    console.error('Error loading word catalogue from Firestore:', error);
    return [];
  }
}

// Random Trials Functions
export async function saveRandomTrialsToFirestore(randomTrials) {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.RANDOM_TRIALS, userId);
    
    await setDoc(docRef, {
      trials: randomTrials,
      lastUpdated: serverTimestamp(),
      userId: userId
    }, { merge: true });
    
    console.log('Random trials saved to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving random trials to Firestore:', error);
    return false;
  }
}

export async function loadRandomTrialsFromFirestore() {
  try {
    const userId = getUserId();
    const docRef = doc(db, COLLECTIONS.RANDOM_TRIALS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Random trials loaded from Firestore');
      return data.trials || [];
    } else {
      console.log('No random trials found in Firestore');
      return [];
    }
  } catch (error) {
    console.error('Error loading random trials from Firestore:', error);
    return [];
  }
}

// Sync functions that work with localStorage as backup
export async function syncWordCatalogue(localWordCatalogue) {
  try {
    // Try to load from Firestore first
    const firestoreData = await loadWordCatalogueFromFirestore();
    
    if (firestoreData.length > 0) {
      // If Firestore has data, use it and update localStorage
      localStorage.setItem('wordCatalogue', JSON.stringify(firestoreData));
      return firestoreData;
    } else if (localWordCatalogue.length > 0) {
      // If localStorage has data but Firestore doesn't, upload to Firestore
      await saveWordCatalogueToFirestore(localWordCatalogue);
      return localWordCatalogue;
    } else {
      // Both are empty
      return [];
    }
  } catch (error) {
    console.error('Error syncing word catalogue:', error);
    // Fall back to localStorage data
    return localWordCatalogue;
  }
}

export async function syncRandomTrials(localRandomTrials) {
  try {
    // Try to load from Firestore first
    const firestoreData = await loadRandomTrialsFromFirestore();
    
    if (firestoreData.length > 0) {
      // If Firestore has data, use it and update localStorage
      localStorage.setItem('randomTrials', JSON.stringify(firestoreData));
      return firestoreData;
    } else if (localRandomTrials.length > 0) {
      // If localStorage has data but Firestore doesn't, upload to Firestore
      await saveRandomTrialsToFirestore(localRandomTrials);
      return localRandomTrials;
    } else {
      // Both are empty
      return [];
    }
  } catch (error) {
    console.error('Error syncing random trials:', error);
    // Fall back to localStorage data
    return localRandomTrials;
  }
}