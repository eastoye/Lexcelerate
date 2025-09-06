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

// Update stats summary cards
function updateStatsSummary() {
  const totalWordsEl = document.getElementById('total-words');
  const averageScoreEl = document.getElementById('average-score');
  const bestStreakEl = document.getElementById('best-streak');
  
  if (!totalWordsEl || !averageScoreEl || !bestStreakEl) return;
  
  // Calculate total words
  const totalWords = wordCatalogue.length;
  totalWordsEl.textContent = totalWords;
  
  // Calculate average score
  let averageScore = 0;
  if (totalWords > 0) {
    const totalScore = wordCatalogue.reduce((sum, word) => sum + (word.score || 0), 0);
    averageScore = Math.round(totalScore / totalWords);
  }
  averageScoreEl.textContent = averageScore;
  
  // Calculate best streak
  const bestStreak = wordCatalogue.reduce((max, word) => {
    const streak = word.streak || 0;
    return streak > max ? streak : max;
  }, 0);
  bestStreakEl.textContent = bestStreak;
}

// Enhanced Stats List Rendering (TARGET UI)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function renderStatsList(words) {
  const statsListDiv = document.getElementById('stats-list');
  if (!statsListDiv) return;
  
  if (!words || words.length === 0) {
    statsListDiv.innerHTML = '<p class="no-words">No words added yet.</p>';
    return;
  }
  
  let html = '';
  words.forEach((wordObj, index) => {
    const mistakeCount = Object.keys(wordObj.mistakes || {}).length;
    const hasDetails = (wordObj.totalAttempts || 0) > 0 || mistakeCount > 0;
    
    html += `
      <div class="word-stat-item" data-word="${escapeHtml((wordObj.word || '').toLowerCase())}">
        <div class="word-stat-header">
          <div class="word-info">
            <button class="toggle-details" data-word-index="${index}" aria-label="Toggle details for ${escapeHtml(wordObj.word)}">
              <span class="word-name">${escapeHtml((wordObj.word || '').toLowerCase())}</span> ▾
            </button>
          </div>
          <div class="word-score">Score: ${Math.round(wordObj.score || 0)}</div>
          <button class="delete-word" data-word-index="${index}" aria-label="Delete word">×</button>
        </div>
        ${hasDetails ? `
          <div class="details" id="details-${index}" style="display: none;">
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

function updateStatsList() {
  // Update stats summary when updating stats list
  updateStatsSummary();
  
  // Use enhanced renderer
  renderStatsList(wordCatalogue || []);
}

function updateRandomStatsList() {
  const randomStatsDiv = document.getElementById('random-stats');
  let html = '<h3 class="section-title">Random Word Trials</h3>';
  if (randomTrials.length === 0) {
    html += '<p class="no-words">No random word trials recorded.</p>';
  } else {
    html += '<div class="random-stats-list">';
    randomTrials.forEach((trial, idx) => {
      html += `
        <div class="word-stat-item">
          <div class="word-stat-header">
            <div class="word-info">
              <span class="word-name">${escapeHtml(trial.word)}</span>
            </div>
            <div class="word-score">
              Attempts: ${trial.attempts} | ${trial.correct ? '✓' : '✗'}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  randomStatsDiv.innerHTML = html;
}

document.getElementById('toggle-random-stats-btn').addEventListener('click', () => {
  const randomStatsDiv = document.getElementById('random-stats');
  const toggleBtn = document.getElementById('toggle-random-stats-btn');
  
  if (randomStatsDiv.style.display === 'block') {
    randomStatsDiv.style.display = 'none';
    toggleBtn.innerHTML = '<span class="btn-icon">🎲</span><span class="btn-text">Show Random Trials</span>';
  } else {
    updateRandomStatsList();
    randomStatsDiv.style.display = 'block';
    toggleBtn.innerHTML = '<span class="btn-icon">🎲</span><span class="btn-text">Hide Random Trials</span>';
  }
});

// Event delegation for stats list interactions
document.addEventListener('click', (e) => {
  // Handle toggle details button click
  if (e.target.closest('.toggle-details')) {
    const wordIndex = e.target.closest('.toggle-details').getAttribute('data-word-index');
    const detailsDiv = document.getElementById(`details-${wordIndex}`);
    
    if (detailsDiv) {
      const isExpanded = detailsDiv.style.display === 'block';
      detailsDiv.style.display = isExpanded ? 'none' : 'block';
      
      // Update arrow in button text
      const toggleBtn = e.target.closest('.toggle-details');
      const currentText = toggleBtn.innerHTML;
      if (isExpanded) {
        toggleBtn.innerHTML = currentText.replace('▴', '▾');
      } else {
        toggleBtn.innerHTML = currentText.replace('▾', '▴');
      }
      
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
    }
  }
  
  // Handle delete word
  if (e.target.closest('.delete-word')) {
    const wordIndex = parseInt(e.target.closest('.delete-word').getAttribute('data-word-index'));
    const wordObj = wordCatalogue[wordIndex];
    
    if (wordObj && confirm(`Delete word "${wordObj.word}"?`)) {
      wordCatalogue.splice(wordIndex, 1);
      saveCatalogue();
      updateStatsList();
      refreshSmartList();
    }
  }
});

// ---------------------------
// Smart List UI Functions
// ---------------------------
function updateSmartList() {
  const nInput = document.getElementById('smart-list-n');
  const sourceSelect = document.getElementById('smart-list-source');
  const smartListDiv = document.getElementById('smart-list-display');
  
  if (!nInput || !sourceSelect || !smartListDiv) return;
  
  const n = parseInt(nInput.value) || 10;
  const source = sourceSelect.value;
  
  const smartWords = getSmartList(n, source);
  
  let html = `<h4>Smart List (Top ${n} - ${source.replace('_', ' ')})</h4>`;
  
  if (smartWords.length === 0) {
    html += '<p class="no-words">No words match the selected criteria.</p>';
  } else {
    html += '<div class="smart-list-words">';
    smartWords.forEach((wordObj, index) => {
      const errorCount = Object.keys(wordObj.mistakes || {}).length;
      html += `
        <div class="smart-word-item">
          <div>
            <span class="word-rank">#${index + 1}</span>
            <strong>${escapeHtml(wordObj.word)}</strong>
          </div>
          <div>
            <span class="word-score">Score: ${Math.round(wordObj.score || 0)}</span>
            ${errorCount > 0 ? `<span class="error-indicator">${errorCount} errors</span>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  smartListDiv.innerHTML = html;
}

// Smart List refresh button handler
document.addEventListener('DOMContentLoaded', () => {
  // Use a MutationObserver to handle dynamically added elements
  const observer = new MutationObserver(() => {
    const refreshBtn = document.getElementById('refresh-smart-list');
    if (refreshBtn && !refreshBtn._hasListener) {
      refreshBtn._hasListener = true;
      refreshBtn.addEventListener('click', () => {
        updateSmartList();
      });
    }
    
    // Also handle smart list input changes
    const nInput = document.getElementById('smart-list-n');
    const sourceSelect = document.getElementById('smart-list-source');
    
    if (nInput && !nInput._hasListener) {
      nInput._hasListener = true;
      nInput.addEventListener('input', updateSmartList);
    }
    
    if (sourceSelect && !sourceSelect._hasListener) {
      sourceSelect._hasListener = true;
      sourceSelect.addEventListener('change', updateSmartList);
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
});

// Auto-refresh mechanism - call after score updates
function refreshSmartList() {
  if (document.getElementById('smart-list-display')) {
    updateSmartList();
  }
}

function showScreen(screenId) {
  document.querySelectorAll('.screen, #home-screen, #login-screen').forEach(screen => {
    screen.style.display = 'none';
  });
  // Handle the renamed auth screen
  if (screenId === 'login-screen') screenId = 'auth-screen';
  document.getElementById(screenId).style.display = 'block';
  if (screenId === 'home-screen') updateProgressSummary();
  if (screenId === 'stats-screen') {
    updateStatsList();
    // Initialize smart list when stats screen is shown
    setTimeout(() => {
      updateSmartList();
    }, 100);
  }
}