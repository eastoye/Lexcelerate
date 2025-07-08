// Global variables
let soundEnabled = true;
let wordCatalogue = [];
let randomTrials = [];
let currentUser = null;

// Import utilities
import { getCurrentUser } from './auth-utils.js';
import { saveToAirtable } from './airtable-utils.js';
// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  currentUser = getCurrentUser();
  loadSoundPreference();
  loadWordCatalogue();
  loadRandomTrials();
  updateStatsSummary();
  updateStatsList();
  setupEventListeners();
});

// Load sound preference from localStorage
function loadSoundPreference() {
  const savedSound = localStorage.getItem('soundEnabled');
  soundEnabled = savedSound !== null ? JSON.parse(savedSound) : true;
  updateSoundToggle();
}

// Save sound preference to localStorage
function saveSoundPreference() {
  localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
}

// Update sound toggle button appearance
function updateSoundToggle() {
  const soundIcon = document.getElementById('sound-icon');
  const soundToggle = document.getElementById('sound-toggle-btn');
  
  if (soundEnabled) {
    soundIcon.textContent = '🔊';
    soundToggle.classList.remove('sound-off');
  } else {
    soundIcon.textContent = '🔇';
    soundToggle.classList.add('sound-off');
  }
}

// Load user's word catalogue from localStorage
function loadWordCatalogue() {
  const saved = localStorage.getItem('wordCatalogue');
  wordCatalogue = saved ? JSON.parse(saved) : [];
  
  // Ensure each word has required fields
  wordCatalogue.forEach(wordObj => {
    if (typeof wordObj.score !== 'number') wordObj.score = 0;
    if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
    if (!wordObj.definition) wordObj.definition = '';
    if (!wordObj.dateAdded) wordObj.dateAdded = new Date().toISOString();
    if (!wordObj.mistakes) wordObj.mistakes = {};
    if (!wordObj.totalAttempts) wordObj.totalAttempts = 0;
    if (!wordObj.correctFirstTryCount) wordObj.correctFirstTryCount = 0;
  });
  
  saveWordCatalogue();
}

// Save word catalogue to localStorage
async function saveWordCatalogue() {
  localStorage.setItem('wordCatalogue', JSON.stringify(wordCatalogue));
  
  // Save to Airtable if user is authenticated
  if (currentUser) {
    try {
      await saveToAirtable(wordCatalogue);
    } catch (error) {
      console.error('Error saving to Airtable:', error);
    }
  }
}

// Load random trials from localStorage
function loadRandomTrials() {
  const saved = localStorage.getItem('randomTrials');
  randomTrials = saved ? JSON.parse(saved) : [];
}

// Save random trials to localStorage
function saveRandomTrials() {
  localStorage.setItem('randomTrials', JSON.stringify(randomTrials));
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Update stats summary
function updateStatsSummary() {
  const totalWords = wordCatalogue.length;
  const averageScore = totalWords > 0 ? 
    Math.round(wordCatalogue.reduce((sum, word) => sum + word.score, 0) / totalWords) : 0;
  const bestStreak = wordCatalogue.length > 0 ? 
    Math.max(...wordCatalogue.map(word => word.streak)) : 0;
  
  document.getElementById('total-words').textContent = totalWords;
  document.getElementById('average-score').textContent = averageScore;
  document.getElementById('best-streak').textContent = bestStreak;
}

// Update stats list
function updateStatsList() {
  const statsListDiv = document.getElementById('stats-list');
  
  if (wordCatalogue.length === 0) {
    statsListDiv.innerHTML = '<div class="no-words">No words in your catalogue yet. <a href="add-word.html">Add some words</a> to get started!</div>';
    return;
  }
  
  // Sort words by score (lowest first) and then by date added
  const sortedWords = [...wordCatalogue].sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return new Date(b.dateAdded) - new Date(a.dateAdded);
  });
  
  let html = '';
  sortedWords.forEach((wordObj, index) => {
    const hasMistakes = Object.keys(wordObj.mistakes || {}).length > 0;
    const mistakeCount = Object.values(wordObj.mistakes || {}).reduce((sum, count) => sum + count, 0);
    const accuracy = wordObj.totalAttempts > 0 ? 
      Math.round((wordObj.correctFirstTryCount / wordObj.totalAttempts) * 100) : 0;
    
    html += `
      <div class="word-stat-item">
        <div class="word-stat-header" data-index="${index}">
          <div class="word-info">
            <span class="word-name">${wordObj.word}</span>
            ${hasMistakes ? '<span class="mistake-indicator" title="Has mistakes">!</span>' : ''}
            <span class="word-score">Score: ${wordObj.score}</span>
          </div>
          <div class="word-actions">
            <button class="toggle-details" data-index="${index}" title="Show details">
              <span class="toggle-icon">▼</span>
            </button>
            <button class="delete-word" data-index="${index}" title="Delete word">
              <span class="delete-icon">🗑️</span>
            </button>
          </div>
        </div>
        <div class="word-details" id="details-${index}" style="display: none;">
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Total Attempts:</span>
              <span class="detail-value">${wordObj.totalAttempts || 0}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">First-Try Correct:</span>
              <span class="detail-value">${wordObj.correctFirstTryCount || 0}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Current Streak:</span>
              <span class="detail-value">${wordObj.streak || 0}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Accuracy:</span>
              <span class="detail-value">${accuracy}%</span>
            </div>
          </div>
          ${wordObj.definition ? `<div class="word-definition"><strong>Definition:</strong> ${wordObj.definition}</div>` : ''}
          ${hasMistakes ? `
            <div class="mistakes-section">
              <h4 class="mistakes-title">Common Mistakes (${mistakeCount} total):</h4>
              <div class="mistakes-list">
                ${Object.entries(wordObj.mistakes).map(([mistake, count]) => 
                  `<span class="mistake-item">${mistake} <span class="mistake-count">(${count}x)</span></span>`
                ).join('')}
              </div>
            </div>
          ` : '<div class="no-mistakes">No mistakes recorded yet! 🎉</div>'}
          <div class="word-meta">
            <span class="date-added">Added: ${formatDate(wordObj.dateAdded)}</span>
          </div>
        </div>
      </div>
    `;
  });
  
  statsListDiv.innerHTML = html;
  
  // Add event listeners for toggle and delete buttons
  document.querySelectorAll('.toggle-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = e.target.closest('.toggle-details').getAttribute('data-index');
      const detailsDiv = document.getElementById('details-' + index);
      const toggleIcon = e.target.closest('.toggle-details').querySelector('.toggle-icon');
      
      if (detailsDiv.style.display === 'block') {
        detailsDiv.style.display = 'none';
        toggleIcon.textContent = '▼';
      } else {
        detailsDiv.style.display = 'block';
        toggleIcon.textContent = '▲';
      }
    });
  });
  
  document.querySelectorAll('.delete-word').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = e.target.closest('.delete-word').getAttribute('data-index');
      const sortedWords = [...wordCatalogue].sort((a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }
        return new Date(b.dateAdded) - new Date(a.dateAdded);
      });
      const wordToDelete = sortedWords[index];
      
      if (confirm(`Delete "${wordToDelete.word}" from your catalogue?\n\nThis action cannot be undone.`)) {
        // Find the word in the original array and remove it
        const originalIndex = wordCatalogue.findIndex(w => w.word === wordToDelete.word && w.dateAdded === wordToDelete.dateAdded);
        if (originalIndex !== -1) {
          wordCatalogue.splice(originalIndex, 1);
          saveWordCatalogue();
          updateStatsSummary();
          updateStatsList();
          showNotification(`"${wordToDelete.word}" deleted successfully`, 'info');
        }
      }
    });
  });
}

// Update random stats list
function updateRandomStatsList() {
  const randomStatsDiv = document.getElementById('random-stats-list');
  
  if (randomTrials.length === 0) {
    randomStatsDiv.innerHTML = '<div class="no-random-trials">No random word trials recorded yet. Try practicing in Random mode!</div>';
    return;
  }
  
  // Sort by most recent attempts
  const sortedTrials = [...randomTrials].sort((a, b) => (b.attempts || 0) - (a.attempts || 0));
  
  let html = '';
  sortedTrials.forEach((trial, index) => {
    const successRate = trial.attempts > 0 ? (trial.correct ? 100 : 0) : 0;
    
    html += `
      <div class="random-trial-item">
        <div class="trial-header">
          <span class="trial-word">${trial.word}</span>
          <span class="trial-status ${trial.correct ? 'correct' : 'incorrect'}">
            ${trial.correct ? '✓' : '✗'}
          </span>
        </div>
        <div class="trial-stats">
          <span class="trial-attempts">Attempts: ${trial.attempts || 0}</span>
          <span class="trial-success">Success: ${trial.correct ? 'Yes' : 'No'}</span>
        </div>
      </div>
    `;
  });
  
  randomStatsDiv.innerHTML = html;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Export catalogue
function exportCatalogue() {
  const exportData = JSON.stringify(wordCatalogue, null, 2);
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(exportData).then(() => {
      showNotification('Catalogue copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback to prompt
      prompt('Copy this JSON data to backup your catalogue:', exportData);
    });
  } else {
    // Fallback to prompt for older browsers
    prompt('Copy this JSON data to backup your catalogue:', exportData);
  }
}

// Import catalogue
function importCatalogue() {
  document.getElementById('import-modal').style.display = 'block';
  document.getElementById('import-textarea').focus();
}

// Process import data
function processImportData() {
  const importData = document.getElementById('import-textarea').value.trim();
  
  if (!importData) {
    showNotification('Please paste JSON data to import', 'warning');
    return;
  }
  
  try {
    const imported = JSON.parse(importData);
    
    if (!Array.isArray(imported)) {
      showNotification('Invalid data format. Expected an array of words.', 'warning');
      return;
    }
    
    // Validate structure
    const isValid = imported.every(item => 
      typeof item === 'object' && 
      typeof item.word === 'string' && 
      item.word.trim().length > 0
    );
    
    if (!isValid) {
      showNotification('Invalid data structure. Each item must have a "word" property.', 'warning');
      return;
    }
    
    // Confirm replacement
    const confirmMessage = `This will replace your current catalogue of ${wordCatalogue.length} words with ${imported.length} imported words.\n\nAre you sure you want to continue?`;
    
    if (confirm(confirmMessage)) {
      // Ensure imported words have all required fields
      imported.forEach(wordObj => {
        if (typeof wordObj.score !== 'number') wordObj.score = 0;
        if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
        if (!wordObj.definition) wordObj.definition = '';
        if (!wordObj.dateAdded) wordObj.dateAdded = new Date().toISOString();
        if (!wordObj.mistakes) wordObj.mistakes = {};
        if (!wordObj.totalAttempts) wordObj.totalAttempts = 0;
        if (!wordObj.correctFirstTryCount) wordObj.correctFirstTryCount = 0;
      });
      
      wordCatalogue = imported;
      saveWordCatalogue();
      updateStatsSummary();
      updateStatsList();
      
      // Close modal and clear textarea
      document.getElementById('import-modal').style.display = 'none';
      document.getElementById('import-textarea').value = '';
      
      showNotification(`Successfully imported ${imported.length} words!`, 'success');
    }
    
  } catch (error) {
    console.error('Import error:', error);
    showNotification('Error parsing JSON data. Please check the format.', 'warning');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Help button
  document.getElementById('help-btn').addEventListener('click', () => {
    document.getElementById('help-modal').style.display = 'block';
  });
  
  // Close help modal
  document.getElementById('help-close').addEventListener('click', () => {
    document.getElementById('help-modal').style.display = 'none';
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    const helpModal = document.getElementById('help-modal');
    const importModal = document.getElementById('import-modal');
    if (event.target === helpModal) {
      helpModal.style.display = 'none';
    }
    if (event.target === importModal) {
      importModal.style.display = 'none';
    }
  });
  
  // Sound toggle
  document.getElementById('sound-toggle-btn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    saveSoundPreference();
    updateSoundToggle();
    showNotification(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`, 'info');
  });

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Export button
  document.getElementById('export-btn').addEventListener('click', () => {
    if (wordCatalogue.length === 0) {
      showNotification('No words to export. Add some words first!', 'warning');
      return;
    }
    exportCatalogue();
  });

  // Import button
  document.getElementById('import-btn').addEventListener('click', () => {
    importCatalogue();
  });

  // Toggle random stats
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

  // Import modal buttons
  document.getElementById('import-close').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
    document.getElementById('import-textarea').value = '';
  });

  document.getElementById('import-confirm-btn').addEventListener('click', () => {
    processImportData();
  });

  document.getElementById('import-cancel-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
    document.getElementById('import-textarea').value = '';
  });

  // Bottom navigation
  const navIcons = document.querySelectorAll('.nav-icon');
  navIcons.forEach((icon, index) => {
    icon.addEventListener('click', () => {
      switch(index) {
        case 0: // Home
          window.location.href = 'index.html';
          break;
        case 1: // Add Word
          window.location.href = 'add-word.html';
          break;
        case 2: // Stats (current page)
          // Already on stats page
          break;
      }
    });
  });
}