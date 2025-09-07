// ---------------------------
// Global Variables for User & Catalogue
// ---------------------------
let currentUser = null; // Now managed by Firebase Auth
window.wordCatalogue = []; // Loaded per user - make globally accessible

// Global variable for random trials (for random Practice tats)
let randomTrials = [];

// Global practice mode variable ('catalogue' or 'random')
let practiceMode = 'catalogue';

// Global reveal counter for current word
let currentRevealCount = 0;

// Audio feedback
let successAudio = null;

// Initialize audio
function initializeAudio() {
  try {
    successAudio = new Audio('./correctbell.wav');
    successAudio.volume = 0.3; // Set moderate volume
    successAudio.preload = 'auto';
  } catch (error) {
    console.warn('Could not load success audio:', error);
  }
}

// Play success sound
function playSuccessSound() {
  if (successAudio && soundEnabled) {
    try {
      successAudio.currentTime = 0; // Reset to beginning
      successAudio.play().catch(error => {
        console.warn('Could not play success audio:', error);
      });
    } catch (error) {
      console.warn('Error playing success audio:', error);
    }
  }
}

// ---------------------------
// Save catalogue for current user (now uses Supabase via main.js)
function saveCatalogue() {
  if (window.saveUserCatalogueToSupabase) {
    window.saveUserCatalogueToSupabase();
  }
}

// ---------------------------
// Notification (Non-blocking)
function showNotification(message) {
  const notif = document.getElementById('notification');
  notif.textContent = message;
  notif.style.display = 'block';
  setTimeout(() => { notif.style.display = 'none'; }, 2000);
}

// ---------------------------
// Authentication is now handled by main.js and Firebase
// ---------------------------
// Authentication logic moved to main.js

// ---------------------------
// Word of the Day: Persist for 24 hours
// ---------------------------
function loadWordOfTheDay() {
  const defaultWords = [
  "serendipity", "eloquence", "ephemeral", "labyrinth", "mellifluous",
  "arenaceous", "soliloquy", "pahoehoe", "soporific", "skerry", "guffaw",
  "oubliette", "fusty", "proprioception", "hermetic", "bokeh", "smarmy",
  "pavonine", "redound", "citify", "holus-bolus", "stelliferous", "doodad",
  "jubilate", "exculpatory", "dislimn", "favonian", "gainsay", "burnish",
  "whitherward", "heyday", "chatoyant", "pied-à-terre", "debonair",
  "scrimshank", "tagliatelle", "harrumph", "afterclap", "unalienable",
  "mundify", "chartaceous", "mugwump", "gutta-percha", "laudatory",
  "glair", "garble", "scrabbly", "pugilistic", "polemics", "solstitial"
];

  const storedWOTD = localStorage.getItem('wotd');
  const wotdTimestamp = localStorage.getItem('wotdTimestamp');
  const now = Date.now();
  if (storedWOTD && wotdTimestamp && (now - wotdTimestamp < 86400000)) {
    document.getElementById('wotd').textContent = storedWOTD;
  } else {
    let wotd = defaultWords[Math.floor(Math.random() * defaultWords.length)];
    localStorage.setItem('wotd', wotd);
    localStorage.setItem('wotdTimestamp', now);
    document.getElementById('wotd').textContent = wotd;
  }
}

// Use a guard flag to prevent the Word of the Day click handler from firing twice.
let wotdHandling = false;

document.getElementById('wotd').addEventListener('click', () => {
  if (wotdHandling) return;
  wotdHandling = true;
  const wotd = document.getElementById('wotd').textContent;
  fetchDefinition(wotd, (definition) => {
    if (confirm(`Definition: ${definition}\n\nWould you like to add this word to your catalogue?`)) {
      if (!wordCatalogue.find(w => w.word.toLowerCase() === wotd.toLowerCase())) {
        wordCatalogue.push({
          word: wotd,
          totalAttempts: 0,
          correctFirstTryCount: 0,
          mistakes: {},
          nextReview: Date.now(),
          interval: 1,
          score: 0,
          streak: 0
        });
        saveCatalogue();
        showNotification(`"${wotd}" added to your catalogue`);
        updateProgressSummary();
      } else {
        showNotification(`"${wotd}" is already in your catalogue`);
      }
    }
    wotdHandling = false;
  });
});

// Updated fetchDefinition with a callback.
function fetchDefinition(word, callback) {
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
    .then(response => response.json())
    .then(data => {
      let definition = "Definition not found.";
      if (Array.isArray(data) && data[0].meanings && data[0].meanings.length > 0) {
        definition = data[0].meanings[0].definitions[0].definition;
      }
      if (callback) callback(definition);
      else showNotification(`Definition of "${word}": ${definition}`);
    })
    .catch(err => {
      console.error(err);
      showNotification(`Error fetching definition for "${word}".`);
    });
}

// ---------------------------
// Helper Functions for Lexcelerate
// ---------------------------
function getCoveredWord(word) {
  return "_".repeat(word.length);
}

function splitWordIntoSyllables(word) {
  let syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+|$)/gi);
  return syllables ? syllables : [word];
}

function generateSyllableHint(word, attemptCount) {
  let syllables = splitWordIntoSyllables(word);
  let syllablesToReveal = Math.min(attemptCount - 2, syllables.length);
  let hintArray = syllables.map((syl, index) => {
    return index < syllablesToReveal ? syl : "_".repeat(syl.length);
  });
  return hintArray.join("-");
}

// ---------------------------
// Global Variables for Practice Session & Sound
// ---------------------------
let attemptCount = 0;
let currentWordObj = null;
let soundEnabled = true; // Sound ON by default

// ---------------------------
// Dictionary Array for Random Words
// ---------------------------
const dictionaryWords = ["quixotic", "serendipity", "benevolent", "obfuscate", "pulchritude"];
function getRandomDictionaryWord() {
  return { word: dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)] };
}

// ---------------------------
// Progress & Navigation Functions
// ---------------------------
function updateProgressSummary() {
  const summaryDiv = document.getElementById('progress-summary');
  let totalAttempts = 0, totalCorrectFirstTry = 0;
  wordCatalogue.forEach(wordObj => {
    totalAttempts += wordObj.totalAttempts;
    totalCorrectFirstTry += wordObj.correctFirstTryCount;
  });
  let progress = totalAttempts > 0 ? ((totalCorrectFirstTry / totalAttempts) * 100).toFixed(1) : 0;
  summaryDiv.textContent = `Overall First-Attempt Accuracy: ${progress}%`;
}

function updateStatsList() {
  const statsListDiv = document.getElementById('stats-list');
  
  // Update stats summary when updating stats list
  updateStatsSummary();
  
  renderStatsList(wordCatalogue);
}

// Modern card-based rendering function
function renderStatsList(words) {
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
      <div class="word-stat-item" data-word="${wordObj.word.toLowerCase()}">
        <div class="word-stat-header">
          <div class="word-info">
            <button class="toggle-details" data-word-index="${index}" aria-label="Toggle details for ${escapeHtml(wordObj.word)}">
              <span>${escapeHtml(wordObj.word.toLowerCase())}</span>
            </button>
          </div>
          <div class="word-score">Score: ${wordObj.Score || 0}</div>
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

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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

function updateRandomStatsList() {
  const randomStatsDiv = document.getElementById('random-stats');
  let html = '<h3>Random Word Trials</h3>';
  if (randomTrials.length === 0) {
    html += '<p>No random word trials recorded.</p>';
  } else {
    randomTrials.forEach((trial, idx) => {
      html += `<div class="word-stat">
                <strong>${trial.word}</strong>
                <p>Attempts: ${trial.attempts} | Correct: ${trial.correct ? 'Yes' : 'No'}</p>
              </div>`;
    });
  }
  randomStatsDiv.innerHTML = html;
}

document.getElementById('toggle-random-stats-btn').addEventListener('click', () => {
  const randomStatsDiv = document.getElementById('random-stats');
  if (randomStatsDiv.style.display === 'block') {
    randomStatsDiv.style.display = 'none';
    document.getElementById('toggle-random-stats-btn').textContent = 'Show Random Trials';
  } else {
    updateRandomStatsList();
    randomStatsDiv.style.display = 'block';
    document.getElementById('toggle-random-stats-btn').textContent = 'Hide Random Trials';
  }
});

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
    updateStatsSummary();
    updateSmartList(); // Initialize smart list when stats screen is shown
  }
}

// Make showScreen globally accessible
window.showScreen = showScreen;

// Make loadWordOfTheDay globally accessible
window.loadWordOfTheDay = loadWordOfTheDay;

// Make showNotification globally accessible
window.showNotification = showNotification;

// ---------------------------
// Smart List Helper Function
// ---------------------------
function getSmartList(n, source = 'all') {
  if (!window.wordCatalogue || window.wordCatalogue.length === 0) {
    return [];
  }
  
  let filteredWords = [...window.wordCatalogue];
  
  // Apply source filtering
  switch (source) {
    case 'error_history':
      filteredWords = filteredWords.filter(word => 
        Object.keys(word.mistakes || {}).length > 0
      );
      break;
    case 'low_score':
      filteredWords = filteredWords.filter(word => word.score < 50);
      break;
    case 'high_score':
      filteredWords = filteredWords.filter(word => word.score >= 80);
      break;
    case 'all':
    default:
      // No filtering needed
      break;
  }
  
  // Sort by score ascending (lowest scores first)
  filteredWords.sort((a, b) => a.score - b.score);
  
  // Return top N words
  return filteredWords.slice(0, n);
}

// Make getSmartList globally accessible
window.getSmartList = getSmartList;

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
  
  let html = `<h4>Smart List (Top ${n} - ${source})</h4>`;
  
  if (smartWords.length === 0) {
    html += '<p>No words match the selected criteria.</p>';
  } else {
    html += '<div class="smart-list-words">';
    smartWords.forEach((wordObj, index) => {
      const errorCount = Object.keys(wordObj.mistakes || {}).length;
      html += `
        <div class="smart-word-item">
          <span class="word-rank">#${index + 1}</span>
          <strong>${wordObj.word}</strong>
          <span class="word-score">Score: ${wordObj.score}</span>
          ${errorCount > 0 ? `<span class="error-indicator">${errorCount} errors</span>` : ''}
        </div>
      `;
    });
    html += '</div>';
  }
  
  smartListDiv.innerHTML = html;
}

// Auto-refresh mechanism - call after score updates
function refreshSmartList() {
  if (document.getElementById('smart-list-display')) {
    updateSmartList();
  }
}

// Make refresh function globally accessible
window.refreshSmartList = refreshSmartList;

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
      const buttonText = toggleBtn.innerHTML;
      if (isExpanded) {
        toggleBtn.innerHTML = buttonText.replace('▴', '▾');
      } else {
        toggleBtn.innerHTML = buttonText.replace('▾', '▴');
      }
      
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
    }
  }
  
  // Handle delete word
  if (e.target.classList.contains('delete-word')) {
    const wordIndex = parseInt(e.target.getAttribute('data-word-index'));
    const wordObj = wordCatalogue[wordIndex];
    
    if (wordObj && confirm(`Delete word "${wordObj.word}"?`)) {
      wordCatalogue.splice(wordIndex, 1);
      saveCatalogue();
      updateStatsList();
      updateStatsSummary();
      refreshSmartList();
    }
  }
});

// ---------------------------
// Navigation Button Listeners
// ---------------------------
document.getElementById('add-word-btn').addEventListener('click', () => { showScreen('add-word-screen'); });
document.getElementById('practice-btn').addEventListener('click', () => {
  if (practiceMode === 'catalogue' && wordCatalogue.length === 0) { alert('Please add at least one word first!'); return; }
  showScreen('practice-screen');
  loadPracticeWord();
});
document.getElementById('stats-btn').addEventListener('click', () => { showScreen('stats-screen'); });
document.querySelectorAll('.back-btn').forEach(button => {
  button.addEventListener('click', () => { showScreen('home-screen'); });
});

// ---------------------------
// Add Word Functionality (Catalogue)
document.getElementById('save-word-btn').addEventListener('click', () => {
  const wordInput = document.getElementById('word-input');
  const word = wordInput.value.trim();
  if (word !== "") {
    wordCatalogue.push({
      word: word,
      totalAttempts: 0,
      correctFirstTryCount: 0,
      mistakes: {},
      nextReview: Date.now(),
      interval: 1,
      score: 0,
      streak: 0
    });
    saveCatalogue();
    wordInput.value = '';
    showNotification(`"${word}" added`);
    updateProgressSummary();
  } else {
    alert('Please enter a valid word.');
  }
});

// ---------------------------
// Adaptive Learning with Ranking System
// ---------------------------
const maxScore = 100;
function getRandomWord() {
  if (practiceMode === 'random') {
    return getRandomDictionaryWord();
  } else {
    let totalWeight = 0;
    let weights = [];
    wordCatalogue.forEach(wordObj => {
      let weight = (maxScore + 1) - wordObj.score;
      weights.push(weight);
      totalWeight += weight;
    });
    let random = Math.random() * totalWeight;
    let cumulative = 0;
    for (let i = 0; i < wordCatalogue.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) return wordCatalogue[i];
    }
    return wordCatalogue[0];
  }
}

// ---------------------------
// Load Practice Word (based on mode)
function loadPracticeWord() {
  if (practiceMode === 'random') {
    currentWordObj = getRandomDictionaryWord();
    let existing = randomTrials.find(t => t.word.toLowerCase() === currentWordObj.word.toLowerCase());
    if (existing) { existing.attempts = 0; existing.correct = false; }
    else { randomTrials.push({ word: currentWordObj.word, attempts: 0, correct: false }); }
  } else {
    currentWordObj = getRandomWord();
  }
  let actualWord = currentWordObj.word;
  document.getElementById('prompt').textContent = getCoveredWord(actualWord);
  document.getElementById('feedback').textContent = '';
  document.getElementById('spell-input').value = '';
  attemptCount = 0;
  currentRevealCount = 0; // Reset reveal count for each new word
  document.getElementById('spell-input').disabled = false;
  if (soundEnabled) {
    const utterance = new SpeechSynthesisUtterance(actualWord);
    speechSynthesis.speak(utterance);
  }
}

// ---------------------------
// Sound Toggle with Icon Change
document.getElementById('sound-toggle-btn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle-btn').textContent = soundEnabled ? "🔊" : "🔇";
});

// ---------------------------
// Reveal Word on Prompt Tap
// When the prompt is tapped:
// - If sound is ON: reveal the word and automatically speak it.
// - If sound is OFF: reveal the word only; user must press Talk to hear it.
document.getElementById('prompt').addEventListener('click', () => {
  if (currentWordObj) {
    document.getElementById('prompt').textContent = currentWordObj.word;
    if (soundEnabled) {
      const utterance = new SpeechSynthesisUtterance(currentWordObj.word);
      speechSynthesis.speak(utterance);
    }
    const spellInput = document.getElementById('spell-input');
    spellInput.value = "";
    spellInput.disabled = true;
    currentRevealCount++;
    setTimeout(() => {
      document.getElementById('prompt').textContent = getCoveredWord(currentWordObj.word);
      spellInput.disabled = false;
    }, 3000);
  }
});

// ---------------------------
// Talk Button
document.getElementById('talk-btn').addEventListener('click', () => {
  const wordToSpeak = currentWordObj ? currentWordObj.word : "";
  if (!wordToSpeak) { alert("No word available to speak."); return; }
  const utterance = new SpeechSynthesisUtterance(wordToSpeak);
  speechSynthesis.speak(utterance);
});

// ---------------------------
// Enter Key Submission for Practice
document.getElementById('spell-input').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') { event.preventDefault(); document.getElementById('submit-spelling-btn').click(); }
});

// ---------------------------
// Practice Submission Handler for Catalogue Practice
document.getElementById('submit-spelling-btn').addEventListener('click', () => {
  let actualWord = currentWordObj.word;
  const userSpelling = document.getElementById('spell-input').value.trim();
  const feedbackEl = document.getElementById('feedback');
  
  if (userSpelling.toLowerCase() === actualWord.toLowerCase()) {
    feedbackEl.textContent = "Correct!";
    playSuccessSound(); // Play success audio
    if (practiceMode === 'catalogue') {
      currentWordObj.totalAttempts++;
      currentWordObj.streak++;
      let basePoints = 1;
      if (currentWordObj.streak >= 10) basePoints = 5;
      else if (currentWordObj.streak >= 5) basePoints = 2;
      let factor = Math.max(1 - 0.2 * currentRevealCount, 0.2);
      let pointsAwarded = basePoints * factor;
      currentWordObj.score += pointsAwarded;
      if (currentWordObj.score > maxScore) currentWordObj.score = maxScore;
      if (attemptCount === 0) currentWordObj.correctFirstTryCount++;
      saveCatalogue();
      updateProgressSummary();
      refreshSmartList(); // Auto-refresh smart list after score update
    } else {
      let trial = randomTrials.find(t => t.word.toLowerCase() === actualWord.toLowerCase());
      if (trial) trial.correct = true;
    }
    setTimeout(loadPracticeWord, 1500);
  } else {
    attemptCount++;
    feedbackEl.textContent = "Incorrect. Try again!";
    if (practiceMode === 'catalogue') {
      if (!currentWordObj.mistakes) currentWordObj.mistakes = {};
      let attemptLower = userSpelling.toLowerCase();
      if (attemptLower !== actualWord.toLowerCase()) {
        currentWordObj.mistakes[attemptLower] = (currentWordObj.mistakes[attemptLower] || 0) + 1;
      }
      currentWordObj.streak = 0;
      if (currentWordObj.score > 60) currentWordObj.score -= 2;
      else currentWordObj.score -= 1;
      if (currentWordObj.score < 0) currentWordObj.score = 0;
      saveCatalogue();
      refreshSmartList(); // Auto-refresh smart list after score update
    } else {
      let trial = randomTrials.find(t => t.word.toLowerCase() === actualWord.toLowerCase());
      if (trial) trial.attempts++;
      else randomTrials.push({ word: actualWord, attempts: 1, correct: false });
    }
    if (attemptCount < 3) {
      document.getElementById('prompt').textContent = getCoveredWord(actualWord);
    } else {
      document.getElementById('prompt').textContent = generateSyllableHint(actualWord, attemptCount);
    }
  }
});

// ---------------------------
// Export/Import Catalogue Functionality
document.getElementById('export-btn').addEventListener('click', () => {
  const exportData = JSON.stringify(wordCatalogue, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(exportData).then(() => {
      showNotification("Catalogue exported to clipboard");
    }).catch(() => {
      prompt("Copy the following JSON:", exportData);
    });
  } else {
    prompt("Copy the following JSON:", exportData);
  }
});

document.getElementById('import-btn').addEventListener('click', () => {
  let importData = prompt("Paste your catalogue JSON here:");
  if (importData) {
    try {
      const imported = JSON.parse(importData);
      if (Array.isArray(imported)) {
        wordCatalogue = imported;
        saveCatalogue();
        showNotification("Catalogue imported successfully");
        updateStatsList();
      } else {
        alert("Invalid data format.");
      }
    } catch (e) {
      alert("Error parsing JSON.");
    }
  }
});


// Add help button functionality for all screens
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('help-btn-card') && e.target.dataset.help) {
    let helpText = "";
    const helpType = e.target.dataset.help;
    
    switch(helpType) {
      case "auth":
        helpText = "Enter your email and password to sign in or sign up. Toggle between sign in and sign up modes using the link below the form.";
        break;
      case "home":
        helpText = "Home: Use buttons to add words, Practice , view stats, and see the Word of the Day. Click the Word of the Day for its definition and to add it to your catalogue.";
        break;
      case "username":
        helpText = "Choose a unique username to complete your account setup. Your username must be at least 3 characters long and can only contain letters, numbers, and underscores.";
        break;
      case "add-word":
        helpText = "Add Word: Enter a new word to add to your catalogue and press 'Add Word'. The word will be saved to your personal vocabulary list.";
        break;
      case "practice":
        helpText = "Practice: Select your Practice ource from the dropdown (Catalogue, Random Words, or Custom Lists). Click the covered word to reveal it, then type your spelling. Use the Talk button to hear the word spoken aloud.";
        break;
      case "lists":
        helpText = "Custom Lists: Create and manage your custom word lists. Click 'Create New List' to make a new list, or click on existing lists to view and edit them.";
        break;
      case "list-detail":
        helpText = "List Detail: View and manage words in your custom list. Click the title or description to edit them. Add new words using the input field, or remove words using the minus button.";
        break;
      case "stats":
        helpText = "Statistics: View your learning progress and word performance. Export your data, import from backup, or create custom lists. Click on words to see detailed statistics and manage them.";
        break;
      default:
        helpText = "Welcome to Lexcelerate - your personal spelling practice app.";
    }
    
    document.getElementById('help-text').innerHTML = `<p>${helpText}</p>`;
    document.getElementById('help-modal').style.display = 'block';
  }
});

// Help modal close handlers
const helpClose = document.getElementById('help-close');
if (helpClose) {
  helpClose.addEventListener('click', () => {
    document.getElementById('help-modal').style.display = 'none';
  });
}

window.addEventListener('click', (event) => {
  const modal = document.getElementById('help-modal');
  if (event.target == modal) { modal.style.display = 'none'; }
});

// ---------------------------
// On Initial Load - Auth is now handled by main.js
// ---------------------------

// Initialize audio when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeAudio();
});
