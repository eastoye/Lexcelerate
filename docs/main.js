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
window.isGuestMode = false;

// Initialize auth state listener
onAuthStateChange(async (user) => {
  if (user) {
    currentUser = user;
    window.isGuestMode = false; // Ensure we're not in guest mode when signed in
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
      
      // Update welcome message for authenticated user
      const welcomeMessage = document.getElementById('welcome-message');
      if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${userProfile.username}!`;
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
    window.isGuestMode = false;
    console.log('User signed out');
    
    window.wordCatalogue = [];
    window.showScreen('auth-screen');
  }
});

// Initialize the app - show auth screen by default
document.addEventListener('DOMContentLoaded', () => {
  // Check if user was previously in guest mode
  const wasGuestMode = localStorage.getItem('lexcelerate_guest_mode') === 'true';
  if (wasGuestMode) {
    enterGuestMode();
    return;
  }
  
  window.showScreen('auth-screen');
});

// Guest mode functions
function enterGuestMode() {
  window.isGuestMode = true;
  currentUser = { id: 'guest', email: 'guest@local' };
  userProfile = { username: 'Guest User' };
  
  // Store guest mode preference
  localStorage.setItem('lexcelerate_guest_mode', 'true');
  
  // Load data from localStorage instead of Supabase
  loadGuestCatalogueFromLocalStorage();
  
  // Initialize user lists functionality (will use localStorage)
  if (window.initializeUserLists) {
    window.initializeUserLists();
  }
  
  // Initialize smart list generator
  if (window.initializeSmartListGenerator) {
    window.initializeSmartListGenerator();
  }
  
  // Update welcome message for guest user
  const welcomeMessage = document.getElementById('welcome-message');
  if (welcomeMessage) {
    welcomeMessage.textContent = 'Welcome, Guest User!';
  }
  
  window.showScreen('home-screen');
  window.loadWordOfTheDay();
}

function exitGuestMode() {
  window.isGuestMode = false;
  currentUser = null;
  userProfile = null;
  
  // Clear guest mode preference
  localStorage.removeItem('lexcelerate_guest_mode');
  
  // Clear word catalogue
  window.wordCatalogue = [];
  
  // Show auth screen
  window.showScreen('auth-screen');
}

// Load user's catalogue from Supabase
async function loadUserCatalogueFromSupabase() {
  if (window.isGuestMode) {
    loadGuestCatalogueFromLocalStorage();
    return;
  }
  
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

// Load guest catalogue from localStorage
function loadGuestCatalogueFromLocalStorage() {
  try {
    const storedCatalogue = localStorage.getItem('lexcelerate_guest_catalogue');
    if (storedCatalogue) {
      window.wordCatalogue = JSON.parse(storedCatalogue);
      // Ensure all word objects have required properties
      window.wordCatalogue.forEach(wordObj => {
        if (typeof wordObj.score !== 'number') wordObj.score = 0;
        if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
        if (!wordObj.mistakes) wordObj.mistakes = {};
        if (!wordObj.nextReview) wordObj.nextReview = Date.now();
        if (!wordObj.interval) wordObj.interval = 1;
      });
      console.log('Guest catalogue loaded from localStorage:', window.wordCatalogue.length, 'words');
    } else {
      window.wordCatalogue = [];
    }
  } catch (error) {
    console.error('Error loading guest catalogue from localStorage:', error);
    window.wordCatalogue = [];
  }
}

// Save user's catalogue to Supabase
async function saveUserCatalogueToSupabase() {
  if (!currentUser) return;
  
  if (window.isGuestMode) {
    saveGuestCatalogueToLocalStorage();
    return;
  }
  
  const result = await saveToSupabase(window.wordCatalogue);
  if (result.success) {
    console.log('Catalogue saved to Supabase');
  } else {
    console.error('Failed to save catalogue to Supabase:', result.error);
    showNotification('Failed to save to cloud storage');
  }
}

// Save guest catalogue to localStorage
function saveGuestCatalogueToLocalStorage() {
  try {
    localStorage.setItem('lexcelerate_guest_catalogue', JSON.stringify(window.wordCatalogue));
    console.log('Guest catalogue saved to localStorage');
  } catch (error) {
    console.error('Error saving guest catalogue to localStorage:', error);
    if (window.showNotification) {
      window.showNotification('Failed to save data locally');
    }
  }
}

// Override the original saveCatalogue function to use Supabase
window.saveCatalogue = saveUserCatalogueToSupabase;

// Add guest mode button to auth screen
document.addEventListener('DOMContentLoaded', () => {
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) {
    const guestButton = document.createElement('button');
    guestButton.id = 'guest-mode-btn';
    guestButton.className = 'minimal-button guest-mode-btn';
    guestButton.textContent = 'Continue as Guest';
    guestButton.style.marginTop = '1rem';
    guestButton.style.backgroundColor = 'var(--color-mint)';
    guestButton.style.color = 'var(--color-background)';
    
    guestButton.addEventListener('click', enterGuestMode);
    
    // Insert before the toggle text
    const toggleText = document.getElementById('auth-toggle');
    if (toggleText) {
      toggleText.parentNode.insertBefore(guestButton, toggleText);
    }
  }
});

// Auth form handling
document.getElementById('auth-submit-btn').addEventListener('click', async () => {
  const emailOrUsername = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const username = document.getElementById('auth-username')?.value.trim();
  const errorDiv = document.getElementById('auth-error');
  const loadingDiv = document.getElementById('auth-loading');
  
  if (!emailOrUsername || !password) {
    showAuthError(isSignUpMode ? 'Please fill in all fields.' : 'Please enter your email/username and password.');
    return;
  }
  
  if (isSignUpMode && !username) {
    showAuthError('Please enter a username.');
    return;
  }
  
  if (isSignUpMode && username.length < 3) {
    showAuthError('Username must be at least 3 characters long.');
    return;
  }
  
  if (isSignUpMode && !/^[a-zA-Z0-9_]+$/.test(username)) {
    showAuthError('Username can only contain letters, numbers, and underscores.');
    return;
  }
  
  // Show loading state
  loadingDiv.style.display = 'block';
  document.getElementById('auth-submit-btn').disabled = true;
  errorDiv.style.display = 'none';
  
  try {
    let result;
    if (isSignUpMode) {
      // For signup, emailOrUsername should be an email
      if (!emailOrUsername.includes('@')) {
        showAuthError('Please enter a valid email address for signup.');
        return;
      }
      result = await signUp(emailOrUsername, password, username);
    } else {
      // For signin, can be either email or username
      result = await signIn(emailOrUsername, password);
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
  const emailInput = document.getElementById('auth-email');
  const usernameContainer = document.getElementById('auth-username-container');
  
  if (isSignUpMode) {
    title.textContent = 'Sign Up for Lexcelerate';
    submitBtn.textContent = 'Sign Up';
    toggleText.innerHTML = 'Already have an account? <a href="#" id="auth-toggle-link">Sign in</a>';
    emailInput.placeholder = 'Email';
    if (usernameContainer) usernameContainer.style.display = 'block';
  } else {
    title.textContent = 'Sign In to Lexcelerate';
    submitBtn.textContent = 'Sign In';
    toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-toggle-link">Sign up</a>';
    emailInput.placeholder = 'Email or Username';
    if (usernameContainer) usernameContainer.style.display = 'none';
  }
  
  // Re-attach event listener to the new link
  document.getElementById('auth-toggle-link').addEventListener('click', handleAuthToggle);
  
  // Clear form and errors
  document.getElementById('auth-email').value = '';
  if (document.getElementById('auth-username')) {
    document.getElementById('auth-username').value = '';
  }
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
  if (window.isGuestMode) {
    if (confirm('Are you sure you want to exit guest mode? Your data will remain saved locally.')) {
      exitGuestMode();
    }
    return;
  }
  
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
        // Update welcome message with username
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
          welcomeMessage.textContent = `Welcome, ${userProfile.username}!`;
        }
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

// === Practice mode dropdown wiring ===
(function () {
  // Event delegation so it works across screen switches
  document.addEventListener('click', (e) => {
    // Toggle open/close on the trigger
    const trigger = e.target.closest('#current-list-button');
    if (trigger) {
      e.preventDefault();
      const wrapper = trigger.closest('.practice-list-selector');
      const menu = wrapper?.querySelector('#practice-source-menu');
      if (!menu) return;
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!isOpen));
      menu.style.display = isOpen ? 'none' : 'block';
      menu.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      return; // stop here so outside-click handler doesn't immediately close it
    }

    // Select a source from the menu
    const item = e.target.closest('#practice-source-menu .dropdown-item[role="menuitem"]');
    if (item) {
      const wrapper = item.closest('.practice-list-selector');
      const trigger = wrapper?.querySelector('#current-list-button');
      const menu = wrapper?.querySelector('#practice-source-menu');
      const source = item.dataset.source;
      const action = item.dataset.action;

      if (source) {
        // Update the button label
        const icon = source === 'random' ? '🎲' : '📚';
        const label = source === 'random' ? 'Random Words' : 'Catalogue';
        trigger.querySelector('span:first-child').textContent = `${icon} ${label}`;

        // Announce the change (hook your logic here)
        document.dispatchEvent(new CustomEvent('practiceSourceChanged', { detail: { source } }));
      } else if (action === 'open-lists') {
        // Either open a sub-menu or go to your Lists screen
        if (window.showScreen) window.showScreen('my-lists-screen');
      }

      // Close the menu
      trigger.setAttribute('aria-expanded', 'false');
      menu.style.display = 'none';
      menu.setAttribute('aria-hidden', 'true');
      return;
    }

    // Close on outside click
    const openMenu = document.querySelector('#practice-source-menu[aria-hidden="false"]');
    if (openMenu && !openMenu.contains(e.target) && !e.target.closest('#current-list-button')) {
      const trigger = document.querySelector('#current-list-button[aria-expanded="true"]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      openMenu.style.display = 'none';
      openMenu.setAttribute('aria-hidden', 'true');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const menu = document.querySelector('#practice-source-menu[aria-hidden="false"]');
    if (!menu) return;
    const trigger = document.querySelector('#current-list-button[aria-expanded="true"]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    menu.style.display = 'none';
    menu.setAttribute('aria-hidden', 'true');
  });
})();