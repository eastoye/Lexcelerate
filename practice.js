// Global variables
let soundEnabled = true;
let wordCatalogue = [];
let practiceMode = 'catalogue'; // 'catalogue' or 'random'
let currentWordObj = null;
let attemptCount = 0;
let currentRevealCount = 0;
let randomTrials = [];
let currentUser = null;

// Import utilities
import { getCurrentUser } from './auth-utils.js';
import { saveToAirtable } from './airtable-utils.js';
// Built-in dictionary for random mode
const dictionaryWords = [
  "serendipity", "eloquence", "ephemeral", "labyrinth", "mellifluous",
  "quintessential", "ubiquitous", "perspicacious", "magnanimous", "effervescent",
  "cacophony", "euphemism", "juxtaposition", "onomatopoeia", "palindrome",
  "sycophant", "vicarious", "zeitgeist", "bourgeois", "renaissance",
  "entrepreneur", "silhouette", "bureaucracy", "hierarchy", "psychology",
  "philosophy", "archaeology", "mythology", "geography", "biography",
  "catastrophe", "metamorphosis", "photosynthesis", "chromosome", "phenomenon"
];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  currentUser = getCurrentUser();
  loadSoundPreference();
  loadWordCatalogue();
  loadRandomTrials();
  setupEventListeners();
  loadPracticeWord();
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

// Get covered word (underscores)
function getCoveredWord(word) {
  return "_".repeat(word.length);
}

// Split word into syllables (basic implementation)
function splitWordIntoSyllables(word) {
  // Simple syllable detection based on vowel patterns
  const syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
  return syllables && syllables.length > 0 ? syllables : [word];
}

// Generate syllable hint
function generateSyllableHint(word, attemptCount) {
  const syllables = splitWordIntoSyllables(word);
  const syllablesToReveal = Math.min(attemptCount - 2, syllables.length);
  
  const hintArray = syllables.map((syl, index) => {
    return index < syllablesToReveal ? syl : "_".repeat(syl.length);
  });
  
  return hintArray.join("-");
}

// Get random word based on mode
function getRandomWord() {
  if (practiceMode === 'random') {
    const randomWord = dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)];
    return { word: randomWord, score: 0, streak: 0 };
  } else {
    if (wordCatalogue.length === 0) {
      showNotification('No words in catalogue! Add some words first.', 'warning');
      return null;
    }
    
    // Weighted selection based on score (lower scores more likely)
    const maxScore = 100;
    let totalWeight = 0;
    const weights = [];
    
    wordCatalogue.forEach(wordObj => {
      const weight = (maxScore + 1) - wordObj.score;
      weights.push(weight);
      totalWeight += weight;
    });
    
    let random = Math.random() * totalWeight;
    let cumulative = 0;
    
    for (let i = 0; i < wordCatalogue.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return wordCatalogue[i];
      }
    }
    
    return wordCatalogue[0];
  }
}

// Load practice word
function loadPracticeWord() {
  currentWordObj = getRandomWord();
  
  if (!currentWordObj) {
    return;
  }
  
  const word = currentWordObj.word;
  
  // Reset state
  attemptCount = 0;
  currentRevealCount = 0;
  
  // Update display
  document.getElementById('prompt').querySelector('.prompt-text').textContent = getCoveredWord(word);
  document.getElementById('feedback').textContent = '';
  document.getElementById('spell-input').value = '';
  document.getElementById('spell-input').disabled = false;
  
  // Update progress display
  updateProgressDisplay();
  
  // Speak word if sound is enabled
  if (soundEnabled) {
    speakWord(word);
  }
  
  // Track random trial
  if (practiceMode === 'random') {
    let existingTrial = randomTrials.find(t => t.word.toLowerCase() === word.toLowerCase());
    if (existingTrial) {
      existingTrial.attempts = 0;
      existingTrial.correct = false;
    } else {
      randomTrials.push({ word: word, attempts: 0, correct: false });
    }
    saveRandomTrials();
  }
}

// Speak word using speech synthesis
function speakWord(word) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }
}

// Update progress display
function updateProgressDisplay() {
  if (currentWordObj) {
    document.getElementById('current-score').textContent = currentWordObj.score || 0;
    document.getElementById('current-streak').textContent = currentWordObj.streak || 0;
  }
  document.getElementById('attempt-count').textContent = attemptCount + 1;
}

// Handle word reveal
function revealWord() {
  if (!currentWordObj) return;
  
  const word = currentWordObj.word;
  const promptText = document.getElementById('prompt').querySelector('.prompt-text');
  
  // Show the word
  promptText.textContent = word;
  currentRevealCount++;
  
  // Speak if sound is enabled
  if (soundEnabled) {
    speakWord(word);
  }
  
  // Disable input temporarily
  const spellInput = document.getElementById('spell-input');
  spellInput.disabled = true;
  
  // Hide word after 3 seconds
  setTimeout(() => {
    promptText.textContent = getCoveredWord(word);
    spellInput.disabled = false;
    spellInput.focus();
  }, 3000);
}

// Handle spelling submission
function submitSpelling() {
  if (!currentWordObj) return;
  
  const word = currentWordObj.word;
  const userSpelling = document.getElementById('spell-input').value.trim();
  const feedbackEl = document.getElementById('feedback');
  
  if (!userSpelling) {
    showNotification('Please enter a spelling', 'warning');
    return;
  }
  
  if (userSpelling.toLowerCase() === word.toLowerCase()) {
    // Correct answer
    feedbackEl.innerHTML = '<span class="feedback-correct">✓ Correct!</span>';
    
    if (practiceMode === 'catalogue') {
      // Update catalogue word stats
      currentWordObj.totalAttempts++;
      currentWordObj.streak++;
      
      // Calculate points
      let basePoints = 1;
      if (currentWordObj.streak >= 10) basePoints = 5;
      else if (currentWordObj.streak >= 5) basePoints = 2;
      
      // Apply reveal penalty
      const revealPenalty = Math.max(1 - 0.2 * currentRevealCount, 0.2);
      const pointsAwarded = Math.round(basePoints * revealPenalty);
      
      currentWordObj.score += pointsAwarded;
      if (currentWordObj.score > 100) currentWordObj.score = 100;
      
      // Track first-try success
      if (attemptCount === 0) {
        currentWordObj.correctFirstTryCount++;
      }
      
      saveWordCatalogue();
      
      // Show points earned
      if (pointsAwarded > 0) {
        showNotification(`+${pointsAwarded} points! Streak: ${currentWordObj.streak}`, 'success');
      }
    } else {
      // Random mode
      const trial = randomTrials.find(t => t.word.toLowerCase() === word.toLowerCase());
      if (trial) {
        trial.correct = true;
      }
      saveRandomTrials();
      showNotification('Correct!', 'success');
    }
    
    // Auto-advance after 1.5 seconds
    setTimeout(() => {
      loadPracticeWord();
    }, 1500);
    
  } else {
    // Incorrect answer
    attemptCount++;
    feedbackEl.innerHTML = '<span class="feedback-incorrect">✗ Incorrect. Try again!</span>';
    
    if (practiceMode === 'catalogue') {
      // Track mistake
      if (!currentWordObj.mistakes) currentWordObj.mistakes = {};
      const attemptLower = userSpelling.toLowerCase();
      if (attemptLower !== word.toLowerCase()) {
        currentWordObj.mistakes[attemptLower] = (currentWordObj.mistakes[attemptLower] || 0) + 1;
      }
      
      // Reset streak and reduce score
      currentWordObj.streak = 0;
      if (currentWordObj.score > 60) {
        currentWordObj.score -= 2;
      } else {
        currentWordObj.score -= 1;
      }
      if (currentWordObj.score < 0) currentWordObj.score = 0;
      
      saveWordCatalogue();
    } else {
      // Random mode
      const trial = randomTrials.find(t => t.word.toLowerCase() === word.toLowerCase());
      if (trial) {
        trial.attempts++;
      }
      saveRandomTrials();
    }
    
    // Update prompt with hint after 2+ attempts
    const promptText = document.getElementById('prompt').querySelector('.prompt-text');
    if (attemptCount < 2) {
      promptText.textContent = getCoveredWord(word);
    } else {
      promptText.textContent = generateSyllableHint(word, attemptCount);
    }
    
    // Clear input and update display
    document.getElementById('spell-input').value = '';
    updateProgressDisplay();
  }
}

// Add random word to catalogue
async function addRandomWordToCatalogue() {
  if (!currentWordObj || practiceMode !== 'random') return;
  
  const word = currentWordObj.word;
  
  // Check if already exists
  const existingWord = wordCatalogue.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (existingWord) {
    showNotification(`"${word}" is already in your catalogue!`, 'warning');
    return;
  }
  
  // Fetch definition
  let definition = 'Definition not available';
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await response.json();
    if (Array.isArray(data) && data[0].meanings && data[0].meanings.length > 0) {
      definition = data[0].meanings[0].definitions[0].definition;
    }
  } catch (error) {
    console.error('Error fetching definition:', error);
  }
  
  // Add to catalogue
  const newWord = {
    word: word,
    definition: definition,
    score: 0,
    streak: 0,
    dateAdded: new Date().toISOString(),
    mistakes: {},
    totalAttempts: 0,
    correctFirstTryCount: 0
  };
  
  wordCatalogue.unshift(newWord);
  saveWordCatalogue();
  
  showNotification(`"${word}" added to catalogue!`, 'success');
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
    showNotification(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`, 'info');
  });

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Mode toggle
  document.getElementById('mode-toggle-btn').addEventListener('click', () => {
    if (practiceMode === 'catalogue') {
      practiceMode = 'random';
      document.getElementById('mode-toggle-btn').innerHTML = 
        '<span class="mode-icon">🎲</span><span class="mode-text">Mode: Random</span>';
      document.getElementById('add-random-to-catalogue-btn').style.display = 'inline-flex';
    } else {
      practiceMode = 'catalogue';
      document.getElementById('mode-toggle-btn').innerHTML = 
        '<span class="mode-icon">📚</span><span class="mode-text">Mode: Catalogue</span>';
      document.getElementById('add-random-to-catalogue-btn').style.display = 'none';
    }
    loadPracticeWord();
  });

  // Add random word to catalogue
  document.getElementById('add-random-to-catalogue-btn').addEventListener('click', () => {
    addRandomWordToCatalogue();
  });

  // Word prompt click (reveal)
  document.getElementById('prompt').addEventListener('click', () => {
    revealWord();
  });

  // Talk button
  document.getElementById('talk-btn').addEventListener('click', () => {
    if (currentWordObj) {
      speakWord(currentWordObj.word);
    }
  });

  // Spelling input - Enter key submission
  document.getElementById('spell-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitSpelling();
    }
  });

  // Submit button
  document.getElementById('submit-spelling-btn').addEventListener('click', () => {
    submitSpelling();
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
        case 2: // Practice (current page)
          // Already on practice page
          break;
      }
    });
  });

  // Auto-focus on spelling input
  document.getElementById('spell-input').focus();
}