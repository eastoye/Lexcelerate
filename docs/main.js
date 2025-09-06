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

// Enhanced word statistics rendering functions
function renderWordStatistics(words) {
  const statsListDiv = document.getElementById('stats-list');
  
  if (!words || words.length === 0) {
    statsListDiv.innerHTML = '<p class="no-words">No words added yet.</p>';
    return;
  }
  
  let html = '';
  words.forEach((wordObj, index) => {
    const mistakeCount = Object.keys(wordObj.mistakes || {}).length;
    const hasDetails = wordObj.totalAttempts > 0 || mistakeCount > 0;
    
    html += `
      <div class="word-stat-compact" data-word="${wordObj.word.toLowerCase()}">
        <div class="word-stat-main">
          <div class="word-name-with-dropdown ${hasDetails ? 'expandable' : ''}" data-word-index="${index}">
            <span class="word-name-compact">${escapeHtml(wordObj.word.toLowerCase())}</span>
            ${hasDetails ? '<span class="dropdown-arrow-compact">▾</span>' : ''}
          </div>
          <div class="word-score-compact">Score: ${wordObj.score || 0}</div>
          <button class="delete-word-compact" data-word-index="${index}" aria-label="Delete word">×</button>
        </div>
        ${hasDetails ? `
          <div class="word-details-compact" id="details-${index}">
            <div class="detail-row">
              <span class="detail-label">Total Attempts:</span>
              <span class="detail-value">${wordObj.totalAttempts || 0}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Correct on First Try:</span>
              <span class="detail-value">${wordObj.correctFirstTryCount || 0}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Current Streak:</span>
              <span class="detail-value">${wordObj.streak || 0}</span>
            </div>
            ${mistakeCount > 0 ? `
              <div class="mistakes-section">
                <div class="mistakes-title">Common Mistakes</div>
                ${Object.entries(wordObj.mistakes).map(([mistake, count]) => `
                  <div class="mistake-item">
                    <span class="mistake-word">${escapeHtml(mistake)}</span>
                    <span class="mistake-count">${count}x</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  });
  
  statsListDiv.innerHTML = html;
}

// Enhanced event delegation for statistics interactions
function setupStatsEventHandlers() {
  document.addEventListener('click', (e) => {
    // Handle expandable word details
    if (e.target.closest('.word-name-with-dropdown.expandable')) {
      const wordIndex = e.target.closest('.word-name-with-dropdown').getAttribute('data-word-index');
      const detailsDiv = document.getElementById(`details-${wordIndex}`);
      const dropdownArrow = e.target.closest('.word-name-with-dropdown').querySelector('.dropdown-arrow-compact');
      
      if (detailsDiv && dropdownArrow) {
        const isExpanded = detailsDiv.classList.contains('expanded');
        
        if (isExpanded) {
          detailsDiv.classList.remove('expanded');
          detailsDiv.style.display = 'none';
          dropdownArrow.textContent = '▾';
          e.target.closest('.word-name-with-dropdown').classList.remove('expanded');
        } else {
          detailsDiv.classList.add('expanded');
          detailsDiv.style.display = 'block';
          dropdownArrow.textContent = '▴';
          e.target.closest('.word-name-with-dropdown').classList.add('expanded');
        }
      }
    }
    
    // Handle delete word
    if (e.target.classList.contains('delete-word-compact')) {
      const wordIndex = parseInt(e.target.getAttribute('data-word-index'));
      const wordObj = window.wordCatalogue[wordIndex];
      
      if (wordObj && confirm(`Delete word "${wordObj.word}"?`)) {
        window.wordCatalogue.splice(wordIndex, 1);
        if (window.saveCatalogue) window.saveCatalogue();
        updateEnhancedStatsList();
        updateStatsSummary();
        if (window.refreshSmartList) window.refreshSmartList();
      }
    }
  });
}

// Enhanced stats list update function
function updateEnhancedStatsList() {
  // Update stats summary when updating stats list
  updateStatsSummary();
  renderWordStatistics(window.wordCatalogue);
}

// Update stats summary cards
function updateStatsSummary() {
  const totalWordsEl = document.getElementById('total-words');
  const averageScoreEl = document.getElementById('average-score');
  const bestStreakEl = document.getElementById('best-streak');
  
  if (!totalWordsEl || !averageScoreEl || !bestStreakEl) return;
  
  // Calculate total words
  const totalWords = window.wordCatalogue ? window.wordCatalogue.length : 0;
  totalWordsEl.textContent = totalWords;
  
  // Calculate average score
  let averageScore = 0;
  if (totalWords > 0 && window.wordCatalogue) {
    const totalScore = window.wordCatalogue.reduce((sum, word) => sum + (word.score || 0), 0);
    averageScore = Math.round(totalScore / totalWords);
  }
  averageScoreEl.textContent = averageScore;
  
  // Calculate best streak
  let bestStreak = 0;
  if (window.wordCatalogue) {
    bestStreak = window.wordCatalogue.reduce((max, word) => {
      const streak = word.streak || 0;
      return streak > max ? streak : max;
    }, 0);
  }
  bestStreakEl.textContent = bestStreak;
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
      
      // Update welcome message
      const welcomeMsg = document.getElementById('welcome-message');
      if (welcomeMsg) {
        welcomeMsg.textContent = `Welcome, ${userProfile.username}!`;
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
    
    // Setup enhanced stats event handlers
    setupStatsEventHandlers();
    
    window.showScreen('home-screen');
    if (window.loadWordOfTheDay) window.loadWordOfTheDay();
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
  
  // Override the original updateStatsList function to use enhanced version
  if (window.updateStatsList) {
    window.updateStatsList = updateEnhancedStatsList;
  }
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
    if (window.showNotification) {
      window.showNotification('Failed to save to cloud storage');
    }
  }
}

// Override the original saveCatalogue function to use Supabase
window.saveCatalogue = saveUserCatalogueToSupabase;

// === Auth form + username setup (keep your existing code below) ===

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
    if (window.showNotification) {
      window.showNotification('Error signing out');
    }
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
        const welcomeMsg = document.getElementById('welcome-message');
        if (welcomeMsg) {
          welcomeMsg.textContent = `Welcome, ${userProfile.username}!`;
        }
      }
      
      await loadUserCatalogueFromSupabase();
      window.showScreen('home-screen');
      if (window.loadWordOfTheDay) window.loadWordOfTheDay();
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
window.updateEnhancedStatsList = updateEnhancedStatsList;

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