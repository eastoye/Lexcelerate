// Global variables
let soundEnabled = true;
let wordCatalogue = [];
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  loadSoundPreference();
  setupAuthStateListener();
  setupEventListeners();
});

// Setup authentication state listener
function setupAuthStateListener() {
  // Import auth utilities dynamically
  import('./auth-utils.js').then(({ onAuthStateChange, getCurrentUser }) => {
    onAuthStateChange(async (user) => {
      currentUser = user;
      await loadWordCatalogue();
      updateRecentAdditions();
    });
  }).catch(error => {
    console.error('Error loading auth utilities:', error);
    // Fallback to localStorage only
    loadWordCatalogue();
    updateRecentAdditions();
  });
}

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
  
  if (soundIcon && soundToggle) {
    if (soundEnabled) {
      soundIcon.textContent = '🔊';
      soundToggle.classList.remove('sound-off');
    } else {
      soundIcon.textContent = '🔇';
      soundToggle.classList.add('sound-off');
    }
  }
}

// Load user's word catalogue with backend sync
async function loadWordCatalogue() {
  try {
    // Load from localStorage first
    const saved = localStorage.getItem('wordCatalogue');
    const localWordCatalogue = saved ? JSON.parse(saved) : [];
    
    // Ensure each word has required fields
    localWordCatalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.definition) wordObj.definition = '';
      if (!wordObj.dateAdded) wordObj.dateAdded = new Date().toISOString();
    });
    
    // Sync with backend if user is authenticated
    if (currentUser) {
      try {
        const { syncWordCatalogueWithBackend } = await import('./backend-utils.js');
        wordCatalogue = await syncWordCatalogueWithBackend(localWordCatalogue, currentUser.uid);
        localStorage.setItem('wordCatalogue', JSON.stringify(wordCatalogue));
      } catch (error) {
        console.error('Error syncing with backend:', error);
        wordCatalogue = localWordCatalogue;
      }
    } else {
      wordCatalogue = localWordCatalogue;
    }
    
    saveWordCatalogue();
  } catch (error) {
    console.error('Error loading word catalogue:', error);
    // Fall back to localStorage only
    const saved = localStorage.getItem('wordCatalogue');
    wordCatalogue = saved ? JSON.parse(saved) : [];
  }
}

// Save word catalogue to both localStorage and backend
async function saveWordCatalogue() {
  localStorage.setItem('wordCatalogue', JSON.stringify(wordCatalogue));
  
  if (currentUser) {
    try {
      const { saveWordCatalogueToBackend } = await import('./backend-utils.js');
      await saveWordCatalogueToBackend(wordCatalogue, currentUser.uid);
    } catch (error) {
      console.error('Error saving to backend:', error);
    }
  }
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

// Fetch definition from dictionary API
async function fetchDefinition(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await response.json();
    
    if (Array.isArray(data) && data[0].meanings && data[0].meanings.length > 0) {
      return data[0].meanings[0].definitions[0].definition;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching definition:', error);
    return null;
  }
}

// Add word to catalogue
async function addWordToCatalogue(word, customDefinition = '') {
  // Check if word already exists (case-insensitive)
  const existingWord = wordCatalogue.find(w => w.word.toLowerCase() === word.toLowerCase());
  
  if (existingWord) {
    showNotification(`"${word}" is already in your catalogue!`, 'warning');
    return false;
  }

  // Get definition
  let definition = customDefinition.trim();
  if (!definition) {
    showNotification('Fetching definition...', 'info');
    definition = await fetchDefinition(word);
    if (!definition) {
      definition = 'Definition not available';
    }
  }

  // Add word to catalogue
  const newWord = {
    word: word.trim(),
    definition: definition,
    score: 0,
    streak: 0,
    dateAdded: new Date().toISOString()
  };

  wordCatalogue.unshift(newWord); // Add to beginning for recent additions
  await saveWordCatalogue();
  
  showNotification(`"${word}" added successfully!`, 'success');
  updateRecentAdditions();
  
  // Clear form
  document.getElementById('word-input').value = '';
  document.getElementById('definition-input').value = '';
  
  // Focus back to word input
  document.getElementById('word-input').focus();
  
  return true;
}

// Update recent additions display
function updateRecentAdditions() {
  const recentList = document.getElementById('recent-list');
  const recentWords = wordCatalogue.slice(0, 5); // Show last 5 added words
  
  if (recentWords.length === 0) {
    recentList.innerHTML = '<p class="no-recent">No words added yet</p>';
    return;
  }
  
  recentList.innerHTML = recentWords.map(wordObj => `
    <div class="recent-item">
      <div class="recent-word">${wordObj.word}</div>
      <div class="recent-definition">${wordObj.definition}</div>
      <div class="recent-date">${formatDate(wordObj.dateAdded)}</div>
    </div>
  `).join('');
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
    const modal = document.getElementById('help-modal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Sound toggle - only add listener if element exists
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      saveSoundPreference();
      updateSoundToggle();
      showNotification(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`, 'info');
    });
  }

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Form submission
  document.getElementById('add-word-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const wordInput = document.getElementById('word-input');
    const definitionInput = document.getElementById('definition-input');
    const word = wordInput.value.trim();
    const definition = definitionInput.value.trim();
    
    if (!word) {
      showNotification('Please enter a word', 'warning');
      wordInput.focus();
      return;
    }
    
    // Disable submit button during processing
    const submitBtn = document.getElementById('add-word-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Adding...</span>';
    submitBtn.disabled = true;
    
    try {
      await addWordToCatalogue(word, definition);
    } finally {
      // Re-enable submit button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // Bottom navigation
  const navIcons = document.querySelectorAll('.nav-icon');
  navIcons.forEach((icon, index) => {
    icon.addEventListener('click', () => {
      switch(index) {
        case 0: // Home
          window.location.href = 'index.html';
          break;
        case 1: // Add Word (current page)
          // Already on add word page
          break;
        case 2: // Stats
          window.location.href = 'stats.html';
          break;
      }
    });
  });

  // Auto-focus on word input
  document.getElementById('word-input').focus();
}