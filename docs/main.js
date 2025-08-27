// Main application entry point with Supabase Auth integration
import { signUp, signIn, logOut, onAuthStateChange, createProfile, getUserProfile } from './auth.js';
import { saveToSupabase, loadFromSupabase } from './supabase-api.js';
import './user-lists-ui.js';
import { initializeSmartListGenerator } from './smart-list-generator.js';
import './app.js';

// Global variables
let currentUser = null;
let userProfile = null;
let isSignUpMode = false;

// Initialize auth state listener
onAuthStateChange(async (user) => {
  if (user) {
    currentUser = user;
    console.log('User signed in:', user.email);
    
    // Load user profile
    const profileResult = await getUserProfile();
    if (profileResult.success) {
      userProfile = profileResult.data;
      
      // If user doesn't have a username, show username setup
      if (!userProfile.username) {
        showScreen('username-setup-screen');
        return;
      }
      
    
    }
    
    // Load user's catalogue from Supabase
    await loadUserCatalogueFromSupabase();
    
    // Initialize user lists functionality
    if (window.initializeUserLists) {
      window.initializeUserLists();
    }
    
    // Initialize smart list generator
    initializeSmartListGenerator();
    
    window.showScreen('home-screen');
    loadWordOfTheDay();
  } else {
    currentUser = null;
    userProfile = null;
    console.log('User signed out');
    
    window.wordCatalogue = [];
    window.showScreen('auth-screen');
  }
});

// Initialize the app - show auth screen by default
document.addEventListener('DOMContentLoaded', () => {
  window.showScreen('auth-screen');
});

// Load user's catalogue from Supabase
async function loadUserCatalogueFromSupabase() {
  const result = await loadFromSupabase();
  if (result.success) {
    window.wordCatalogue = result.data;
    // Ensure all word objects have required properties
    window.wordCatalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.mistakes) wordObj.mistakes = {};
      if (!wordObj.nextReview) wordObj.nextReview = Date.now();
      if (!wordObj.interval) wordObj.interval = 1;
    });
    console.log('Catalogue loaded from Supabase:', window.wordCatalogue.length, 'words');
  } else {
    console.error('Failed to load catalogue from Supabase:', result.error);
    window.wordCatalogue = [];
  }
}

// Save user's catalogue to Supabase
async function saveUserCatalogueToSupabase() {
  if (!currentUser) return;
  
  const result = await saveToSupabase(window.wordCatalogue);
  if (result.success) {
    console.log('Catalogue saved to Supabase');
  } else {
    console.error('Failed to save catalogue to Supabase:', result.error);
    showNotification('Failed to save to cloud storage');
  }
}

// Override the original saveCatalogue function to use Supabase
window.saveCatalogue = saveUserCatalogueToSupabase;

// Auth form handling
document.getElementById('auth-submit-btn').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const errorDiv = document.getElementById('auth-error');
  const loadingDiv = document.getElementById('auth-loading');
  
  if (!email || !password) {
    showAuthError('Please enter both email and password.');
    return;
  }
  
  // Show loading state
  loadingDiv.style.display = 'block';
  document.getElementById('auth-submit-btn').disabled = true;
  errorDiv.style.display = 'none';
  
  try {
    let result;
    if (isSignUpMode) {
      result = await signUp(email, password);
    } else {
      result = await signIn(email, password);
    }
    
    if (!result.success) {
      showAuthError(result.error);
    }
    // Success is handled by the auth state change listener
  } catch (error) {
    showAuthError('An unexpected error occurred. Please try again.');
    console.error('Auth error:', error);
  } finally {
    loadingDiv.style.display = 'none';
    document.getElementById('auth-submit-btn').disabled = false;
  }
});

// Toggle between sign in and sign up - define as named function
function handleAuthToggle(e) {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  
  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleText = document.getElementById('auth-toggle');
  const toggleLink = document.getElementById('auth-toggle-link');
  
  if (isSignUpMode) {
    title.textContent = 'Sign Up for Lexcelerate';
    submitBtn.textContent = 'Sign Up';
    toggleText.innerHTML = 'Already have an account? <a href="#" id="auth-toggle-link">Sign in</a>';
  } else {
    title.textContent = 'Sign In to Lexcelerate';
    submitBtn.textContent = 'Sign In';
    toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-toggle-link">Sign up</a>';
  }
  
  // Re-attach event listener to the new link
  document.getElementById('auth-toggle-link').addEventListener('click', handleAuthToggle);
  
  // Clear form and errors
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-error').style.display = 'none';
}

// Initial event listener attachment
document.getElementById('auth-toggle-link').addEventListener('click', handleAuthToggle);

// Show auth error
function showAuthError(message) {
  const errorDiv = document.getElementById('auth-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Update logout button to use Supabase auth
document.getElementById('logout-btn').addEventListener('click', async () => {
  const result = await logOut();
  if (!result.success) {
    console.error('Logout error:', result.error);
    showNotification('Error signing out');
  }
});

// Enter key handling for auth form
document.getElementById('auth-email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('auth-password').focus();
  }
});

document.getElementById('auth-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('auth-submit-btn').click();
  }
});

// Username setup handling
document.getElementById('username-submit-btn').addEventListener('click', async () => {
  const username = document.getElementById('username-input').value.trim();
  const errorDiv = document.getElementById('username-error');
  const loadingDiv = document.getElementById('username-loading');
  
  if (!username) {
    showUsernameError('Please enter a username.');
    return;
  }
  
  if (username.length < 3) {
    showUsernameError('Username must be at least 3 characters long.');
    return;
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showUsernameError('Username can only contain letters, numbers, and underscores.');
    return;
  }
  
  // Show loading state
  loadingDiv.style.display = 'block';
  document.getElementById('username-submit-btn').disabled = true;
  errorDiv.style.display = 'none';
  
  try {
    const result = await createProfile(username);
    
    if (!result.success) {
      if (result.error.includes('duplicate key')) {
        showUsernameError('This username is already taken. Please choose another.');
      } else {
        showUsernameError(result.error);
      }
    } else {
      // Success - reload profile and continue to home
      const profileResult = await getUserProfile();
      if (profileResult.success) {
        userProfile = profileResult.data;
        document.getElementById('welcome-message').textContent = `Welcome, ${userProfile.username}!`;
      }
      
      await loadUserCatalogueFromSupabase();
      window.showScreen('home-screen');
      loadWordOfTheDay();
    }
  } catch (error) {
    showUsernameError('An unexpected error occurred. Please try again.');
    console.error('Username setup error:', error);
  } finally {
    loadingDiv.style.display = 'none';
    document.getElementById('username-submit-btn').disabled = false;
  }
});

// Enter key handling for username setup
document.getElementById('username-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('username-submit-btn').click();
  }
});

// Show username error
function showUsernameError(message) {
  const errorDiv = document.getElementById('username-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Make functions available globally for the existing app.js
window.currentUser = currentUser;
window.userProfile = userProfile;
window.saveUserCatalogueToSupabase = saveUserCatalogueToSupabase;
window.loadUserCatalogueFromSupabase = loadUserCatalogueFromSupabase;

// --- Practice source dropdown
document.addEventListener('DOMContentLoaded', () => {
  const currentBtn = document.getElementById('current-list-button');
  const menu = document.getElementById('practice-source-menu');

  if (currentBtn && menu) {
    currentBtn.addEventListener('click', () => {
      const open = menu.style.display === 'block';
      menu.style.display = open ? 'none' : 'block';
      currentBtn.setAttribute('aria-expanded', String(!open));
      menu.setAttribute('aria-hidden', String(open));
    });

    // click options
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-source],[data-action]');
      if (!item) return;

      if (item.dataset.source === 'catalogue') {
        // hook into your existing logic
        setPracticeSource?.('catalogue');
        currentBtn.firstElementChild.textContent = '📚 Catalogue';
      } else if (item.dataset.source === 'random') {
        setPracticeSource?.('random');
        currentBtn.firstElementChild.textContent = '🎲 Random Words';
      } else if (item.dataset.action === 'open-lists') {
        openListsPicker?.(); // if you have this; otherwise wire as needed
      }
      menu.style.display = 'none';
      currentBtn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !currentBtn.contains(e.target)) {
        menu.style.display = 'none';
        currentBtn.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
      }
    });
  }
});

// Optional: emit a 'sourcechange' event whenever practice source changes
(() => {
  const btn = document.getElementById('current-list-button');
  const menu = document.getElementById('practice-source-menu');
  if (!btn || !menu) return;

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-source]');
    if (!item) return;
    const source = item.dataset.source; // 'catalogue' | 'random'
    const evt = new CustomEvent('sourcechange', { detail: { source } });
    window.dispatchEvent(evt);
  });
})();