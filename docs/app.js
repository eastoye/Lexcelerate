// ---------------------------
// Global Variables for User & Catalogue
// ---------------------------
let currentUser = null; // Now managed by Firebase Auth
window.wordCatalogue = []; // Loaded per user - make globally accessible

// Global variable for random trials (for random practice stats)
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
  notif.classList.add('show');
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
  const defaultWords = ["serendipity", "eloquence", "ephemeral", "labyrinth", "mellifluous"];
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
  const overallProgressEl = document.getElementById('overall-progress');
  const progressSummaryEl = document.getElementById('progress-summary');
  const wordCountEl = document.getElementById('word-count');
  const masteryRateEl = document.getElementById('mastery-rate');
  const accuracyRateEl = document.getElementById('accuracy-rate');
  const wordCountMinimalEl = document.getElementById('word-count-minimal');
  
  let totalAttempts = 0, totalCorrectFirstTry = 0;
  wordCatalogue.forEach(wordObj => {
    totalAttempts += wordObj.totalAttempts;
    totalCorrectFirstTry += wordObj.correctFirstTryCount;
  });
  let progress = totalAttempts > 0 ? ((totalCorrectFirstTry / totalAttempts) * 100).toFixed(1) : 0;
  
  // Update legacy element
  if (summaryDiv) {
    summaryDiv.textContent = `Overall First-Attempt Accuracy: ${progress}%`;
  }
  
  // Update new homepage elements
  if (overallProgressEl) {
    overallProgressEl.textContent = `${progress}%`;
  }
  
  if (wordCountEl) {
    wordCountEl.textContent = wordCatalogue.length.toString();
  }
  
  // Update minimal word count display on home screen
  if (wordCountMinimalEl) {
    wordCountMinimalEl.textContent = wordCatalogue.length.toString();
  }
  
  if (masteryRateEl) {
    const masteredWords = wordCatalogue.filter(word => word.score >= 80).length;
    const masteryRate = wordCatalogue.length > 0 ? ((masteredWords / wordCatalogue.length) * 100).toFixed(0) : 0;
    masteryRateEl.textContent = `${masteryRate}%`;
  }
  
  if (accuracyRateEl) {
    accuracyRateEl.textContent = `${progress}%`;
  }
  
  // Update streak counter
  const streakCountEl = document.getElementById('streak-count');
  if (streakCountEl) {
    const maxStreak = wordCatalogue.reduce((max, word) => Math.max(max, word.streak || 0), 0);
    streakCountEl.textContent = maxStreak.toString();
  }
  
  // Update focus words count (words with low scores)
  const focusWordsEl = document.getElementById('focus-words');
  if (focusWordsEl) {
    const focusWords = wordCatalogue.filter(word => word.score < 50).length;
    focusWordsEl.textContent = focusWords.toString();
  }
}

function updateStatsList() {
  const statsListDiv = document.getElementById('stats-list');
  let html = '';
  if (wordCatalogue.length === 0) {
    html = '<p>No words added.</p>';
  } else {
    wordCatalogue.forEach((wordObj, index) => {
      html += `<div class="word-stat">
                <strong>${wordObj.word}</strong> ${Object.keys(wordObj.mistakes).length > 0 ? '!' : ''}
                (Score: ${wordObj.score})
                <button class="toggle-details" data-index="${index}">▼</button>
                <button class="delete-word" data-index="${index}">Delete</button>
                <div class="details" id="details-${index}">
                  <p>Total Attempts: ${wordObj.totalAttempts}</p>
                  <p>Correct on First Try: ${wordObj.correctFirstTryCount}</p>
                  <p>Streak: ${wordObj.streak}</p>`;
      if (Object.keys(wordObj.mistakes).length > 0) {
        html += `<p>Mistakes:</p><ul>`;
        for (let mistake in wordObj.mistakes) {
          html += `<li>${mistake} : ${wordObj.mistakes[mistake]} time(s)</li>`;
        }
        html += `</ul>`;
      } else {
        html += `<p>No mistakes recorded.</p>`;
      }
      html += `</div></div>`;
    });
  }
  statsListDiv.innerHTML = html;
  
  document.querySelectorAll('.toggle-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      let idx = e.target.getAttribute('data-index');
      let detailsDiv = document.getElementById('details-' + idx);
      if (detailsDiv.style.display === 'block') {
        detailsDiv.style.display = 'none';
        e.target.textContent = '▼';
      } else {
        detailsDiv.style.display = 'block';
        e.target.textContent = '▲';
      }
    });
  });
  
  document.querySelectorAll('.delete-word').forEach(btn => {
    btn.addEventListener('click', (e) => {
      let idx = e.target.getAttribute('data-index');
      if (confirm(`Delete word "${wordCatalogue[idx].word}"?`)) {
        wordCatalogue.splice(idx, 1);
        saveCatalogue();
        updateStatsList();
      }
    });
  });
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
    screen.classList.remove('active');
  });
  // Handle the renamed auth screen
  if (screenId === 'login-screen') screenId = 'auth-screen';
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.style.display = 'block';
    targetScreen.classList.add('active');
  }
  
  // Hide/show header and footer based on screen
  const header = document.getElementById('main-header');
  const footer = document.getElementById('main-footer');
  
  if (screenId === 'home-screen') {
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';
    document.body.style.overflow = 'hidden';
  } else {
    if (header) header.style.display = 'block';
    if (footer) footer.style.display = 'block';
    document.body.style.overflow = 'auto';
  }
  
  if (screenId === 'home-screen') updateProgressSummary();
  if (screenId === 'stats-screen') {
    updateStatsList();
    updateSmartList(); // Initialize smart list when stats screen is shown
  }
}

// Make showScreen globally accessible
window.showScreen = showScreen;

// Make loadWordOfTheDay globally accessible
window.loadWordOfTheDay = loadWordOfTheDay;

// Make showNotification globally accessible
window.showNotification = showNotification;

// Make updateProgressSummary globally accessible
window.updateProgressSummary = updateProgressSummary;
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

// ---------------------------
// Navigation Button Listeners
// ---------------------------
document.getElementById('add-word-btn').addEventListener('click', () => { showScreen('add-word-screen'); });

// Add event listener for the new CTA button and legacy practice button
function handlePracticeClick() {
  if (practiceMode === 'catalogue' && wordCatalogue.length === 0) { alert('Please add at least one word first!'); return; }
  showScreen('practice-screen');
  loadPracticeWord();
}

document.getElementById('practice-btn').addEventListener('click', handlePracticeClick);

// Add event listener for home screen help button
document.addEventListener('DOMContentLoaded', () => {
  const helpBtnHome = document.getElementById('help-btn-home');
  if (helpBtnHome) {
    helpBtnHome.addEventListener('click', () => {
      let helpText = "Home: Use buttons to add words, practice word (toggle between Catalogue and Random modes), view stats, and see the Word of the Day. Click the Word of the Day for options.";
      document.getElementById('help-text').innerHTML = `<p>${helpText}</p>`;
      document.getElementById('help-modal').style.display = 'block';
    });
  }
});

// Add event listeners for feature cards
// Add event listener for minimal stats button
const statsBtn = document.getElementById('stats-btn-minimal');
if (statsBtn) {
  statsBtn.addEventListener('click', () => { showScreen('stats-screen'); });
}

// Legacy stats button
document.querySelectorAll('.back-btn').forEach(button => {
  button.addEventListener('click', () => { showScreen('home-screen'); });
});

// ---------------------------
// Practice Mode Toggle (Catalogue vs. Random)
document.getElementById('mode-toggle-btn').addEventListener('click', () => {
  if (practiceMode === 'catalogue') {
    practiceMode = 'random';
    document.getElementById('mode-toggle-btn').textContent = "Mode: Random";
    document.getElementById('add-random-to-catalogue-btn').style.display = 'inline-block';
  } else {
    practiceMode = 'catalogue';
    document.getElementById('mode-toggle-btn').textContent = "Mode: Catalogue";
    document.getElementById('add-random-to-catalogue-btn').style.display = 'none';
  }
  loadPracticeWord();
});

// ---------------------------
// Add Random Word to Catalogue (only in Random mode)
document.getElementById('add-random-to-catalogue-btn').addEventListener('click', () => {
  if (currentWordObj) {
    let rw = currentWordObj.word;
    if (!wordCatalogue.find(w => w.word.toLowerCase() === rw.toLowerCase())) {
      wordCatalogue.push({
        word: rw,
        totalAttempts: 0,
        correctFirstTryCount: 0,
        mistakes: {},
        nextReview: Date.now(),
        interval: 1,
        score: 0,
        streak: 0
      });
      saveCatalogue();
      showNotification(`"${rw}" added to your catalogue`);
      updateProgressSummary();
    } else {
      showNotification(`"${rw}" is already in your catalogue`);
    }
  }
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

// ---------------------------
// Help Modal Functionality
document.getElementById('help-btn').addEventListener('click', () => {
  let helpText = "";
  const currentScreen = document.querySelector('.screen:not([style*="display: none"]), #home-screen:not([style*="display: none"]), #login-screen:not([style*="display: none"])');
  switch(currentScreen.id) {
    case "login-screen":
      helpText = "Enter your username and password to sign in. All data is stored locally.";
      break;
    case "home-screen":
      helpText = "Home: Use buttons to add words, practice word (toggle between Catalogue and Random modes), view stats, and see the Word of the Day. Click the Word of the Day for options.";
      break;
    case "add-word-screen":
      helpText = "Add Word: Enter a new word to add to your catalogue and press 'Save Word'.";
      break;
    case "practice-screen":
      helpText = "Practice Word: Toggle between Catalogue and Random modes using the Mode button. Click on the covered word to reveal it. If sound is ON, it will be spoken automatically; if OFF, it won't speak unless you press Talk. Note: Revealing the word reduces your score.";
      break;
    case "stats-screen":
      helpText = "Stats: Review your catalogue with detailed stats. Use Export/Import to copy or paste your catalogue. Press 'Show Random Trials' to view random word attempts.";
      break;
    default:
      helpText = "Welcome to Lexcelerate.";
  }
  document.getElementById('help-text').innerHTML = `<p>${helpText}</p>`;
  document.getElementById('help-modal').style.display = 'block';
});

document.getElementById('help-close').addEventListener('click', () => {
  document.getElementById('help-modal').style.display = 'none';
});

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
