// Main application entry point with Firebase Auth integration
import { auth } from './firebase-config.js';
import { signUp, signIn, logOut, onAuthStateChange } from './auth.js';
import { saveToAirtable, loadFromAirtable } from './airtable-api.js';

// Global variables
let currentUser = null;
let isSignUpMode = false;

// Initialize auth state listener
onAuthStateChange(async (user) => {
  if (user) {
    currentUser = user;
    console.log('User signed in:', user.email);
    
    // Load user's catalogue from Airtable
    await loadUserCatalogueFromAirtable();
    
    showScreen('home-screen');
    loadWordOfTheDay();
  } else {
    currentUser = null;
    console.log('User signed out');
    wordCatalogue = [];
    showScreen('auth-screen');
  }
});

// Initialize the app - show auth screen by default
document.addEventListener('DOMContentLoaded', () => {
  // If no user is signed in, show auth screen immediately
  if (!auth.currentUser) {
    showScreen('auth-screen');
  }
});

// Also ensure auth screen shows on initial load
showScreen('auth-screen');
// Load user's catalogue from Airtable
async function loadUserCatalogueFromAirtable() {
  const result = await loadFromAirtable();
  if (result.success) {
    wordCatalogue = result.data;
    // Ensure all word objects have required properties
    wordCatalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.mistakes) wordObj.mistakes = {};
      if (!wordObj.nextReview) wordObj.nextReview = Date.now();
      if (!wordObj.interval) wordObj.interval = 1;
    });
    console.log('Catalogue loaded from Airtable:', wordCatalogue.length, 'words');
  } else {
    console.error('Failed to load catalogue from Airtable:', result.error);
    wordCatalogue = [];
  }
}

// Save user's catalogue to Airtable
async function saveUserCatalogueToAirtable() {
  if (!currentUser) return;
  
  const result = await saveToAirtable(wordCatalogue);
  if (result.success) {
    console.log('Catalogue saved to Airtable');
  } else {
    console.error('Failed to save catalogue to Airtable:', result.error);
    showNotification('Failed to save to cloud storage');
  }
}

// Override the original saveCatalogue function to use Airtable
window.saveCatalogue = saveUserCatalogueToAirtable;

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

// Toggle between sign in and sign up
document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
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
  document.getElementById('auth-toggle-link').addEventListener('click', arguments.callee);
  
  // Clear form and errors
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-error').style.display = 'none';
});

// Show auth error
function showAuthError(message) {
  const errorDiv = document.getElementById('auth-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Update logout button to use Firebase auth
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

// Make functions available globally for the existing app.js
window.currentUser = currentUser;
window.saveUserCatalogueToAirtable = saveUserCatalogueToAirtable;
window.loadUserCatalogueFromAirtable = loadUserCatalogueFromAirtable;