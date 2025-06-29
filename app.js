// Global variables
let soundEnabled = true;
let wordCatalogue = [];

// Word of the Day words list
const defaultWords = [
  "serendipity", "eloquence", "ephemeral", "labyrinth", "mellifluous",
  "quintessential", "ubiquitous", "perspicacious", "magnanimous", "effervescent"
];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  loadSoundPreference();
  loadWordCatalogue();
  loadWordOfTheDay();
  updateProgressSummary();
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
  const soundText = document.getElementById('sound-text');
  const soundToggle = document.getElementById('sound-toggle-btn');
  
  if (soundEnabled) {
    soundIcon.textContent = '🔊';
    soundText.textContent = 'Sound On';
    soundToggle.classList.remove('sound-off');
  } else {
    soundIcon.textContent = '🔇';
    soundText.textContent = 'Sound Off';
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
  });
  
  saveWordCatalogue();
}

// Save word catalogue to localStorage
function saveWordCatalogue() {
  localStorage.setItem('wordCatalogue', JSON.stringify(wordCatalogue));
}

// Load Word of the Day (persists for 24 hours)
function loadWordOfTheDay() {
  const storedWOTD = localStorage.getItem('wotd');
  const wotdTimestamp = localStorage.getItem('wotdTimestamp');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  if (storedWOTD && wotdTimestamp && (now - parseInt(wotdTimestamp) < oneDay)) {
    document.getElementById('wotd').textContent = storedWOTD;
  } else {
    const randomWord = defaultWords[Math.floor(Math.random() * defaultWords.length)];
    localStorage.setItem('wotd', randomWord);
    localStorage.setItem('wotdTimestamp', now.toString());
    document.getElementById('wotd').textContent = randomWord;
  }
}

// Update progress summary
function updateProgressSummary() {
  const wordCount = document.getElementById('word-count');
  wordCount.textContent = wordCatalogue.length;
}

// Show notification
function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
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
      return "Definition not found.";
    }
  } catch (error) {
    console.error('Error fetching definition:', error);
    return "Error fetching definition.";
  }
}

// Add word to catalogue
function addWordToCatalogue(word) {
  const existingWord = wordCatalogue.find(w => w.word.toLowerCase() === word.toLowerCase());
  
  if (!existingWord) {
    wordCatalogue.push({
      word: word,
      score: 0,
      streak: 0
    });
    saveWordCatalogue();
    updateProgressSummary();
    showNotification(`"${word}" added to your catalogue!`);
    return true;
  } else {
    showNotification(`"${word}" is already in your catalogue.`);
    return false;
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
  
  // Sound toggle
  document.getElementById('sound-toggle-btn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    saveSoundPreference();
    updateSoundToggle();
    showNotification(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`);
  });
  
  // Word of the Day click
  document.getElementById('word-of-day').addEventListener('click', async () => {
    const wotd = document.getElementById('wotd').textContent;
    
    if (wotd && wotd !== 'Loading...') {
      showNotification('Fetching definition...');
      const definition = await fetchDefinition(wotd);
      
      const shouldAdd = confirm(
        `Word: ${wotd}\n\nDefinition: ${definition}\n\nWould you like to add this word to your catalogue?`
      );
      
      if (shouldAdd) {
        addWordToCatalogue(wotd);
      }
    }
  });
  
  // Navigation buttons (placeholder navigation)
  document.getElementById('add-word-btn').addEventListener('click', () => {
    // For now, just show a message - you'll build this page next
    alert('Add Word page coming soon! You\'ll build this next.');
    // Later: window.location.href = 'add-word.html';
  });
  
  document.getElementById('practice-btn').addEventListener('click', () => {
    if (wordCatalogue.length === 0) {
      alert('Please add some words to your catalogue first!');
      return;
    }
    // For now, just show a message - you'll build this page next
    alert('Practice Word page coming soon! You\'ll build this next.');
    // Later: window.location.href = 'practice.html';
  });
  
  document.getElementById('stats-btn').addEventListener('click', () => {
    // For now, just show a message - you'll build this page next
    alert('Stats page coming soon! You\'ll build this next.');
    // Later: window.location.href = 'stats.html';
  });
}