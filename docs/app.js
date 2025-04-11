// ---------------------------
// Global Variables for User & Catalogue
// ---------------------------
let currentUser = localStorage.getItem('currentUser');
let wordCatalogue = []; // Loaded per user

// Global variable for random trials (for random practice stats)
let randomTrials = [];

// Global practice mode variable ('catalogue' or 'random')
let practiceMode = 'catalogue';

// Global reveal counter for current word
let currentRevealCount = 0;

// ---------------------------
// Load the current user’s catalogue (or initialize it)
function loadUserCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    wordCatalogue = JSON.parse(localStorage.getItem(key)) || [];
    wordCatalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.mistakes) wordObj.mistakes = {};
      if (!wordObj.nextReview) wordObj.nextReview = Date.now();
      if (!wordObj.interval) wordObj.interval = 1;
    });
    saveCatalogue();
  }
}

// Save catalogue for current user.
function saveCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    localStorage.setItem(key, JSON.stringify(wordCatalogue));
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
// Login / Authentication Section
// ---------------------------
function checkLogin() {
  currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    loadUserCatalogue();
    showScreen('home-screen');
    loadWordOfTheDay();
  } else {
    showScreen('login-screen');
  }
}

document.getElementById('login-btn').addEventListener('click', () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (username === "" || password === "") {
    alert("Please enter both a username and password.");
    return;
  }
  localStorage.setItem('currentUser', username);
  currentUser = username;
  loadUserCatalogue();
  showScreen('home-screen');
  loadWordOfTheDay();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  wordCatalogue = [];
  currentUser = null;
  showScreen('login-screen');
});

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

// For Random Trials Stats
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
  document.getElementById(screenId).style.display = 'block';
  if (screenId === 'home-screen') updateProgressSummary();
  if (screenId === 'stats-screen') updateStatsList();
}

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
// Practice Mode Toggle (Catalogue vs. Random)
// ---------------------------
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
    // Record random trial stats
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
  currentRevealCount = 0;
  document.getElementById('spell-input').disabled = false;
  if (soundEnabled) {
    const utterance = new SpeechSynthesisUtterance(actualWord);
    speechSynthesis.speak(utterance);
  }
}

// ---------------------------
// Dictionary Words for Random Mode
function getRandomDictionaryWord() {
  return { word: dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)] };
}

// ---------------------------
// Sound Toggle with Icon Change
document.getElementById('sound-toggle-btn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle-btn').textContent = soundEnabled ? "🔊" : "🔇";
});

// ---------------------------
// Reveal Word on Prompt Tap with Modified Behavior
document.getElementById('prompt').addEventListener('click', () => {
  if (currentWordObj) {
    // Reveal the word but only speak if sound is on.
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
// Word of the Day Functionality (from fixed list)
function loadWordOfTheDay() {
  const defaultWords = ["serendipity", "eloquence", "ephemeral", "labyrinth", "mellifluous"];
  let wotd = defaultWords[Math.floor(Math.random() * defaultWords.length)];
  document.getElementById('wotd').textContent = wotd;
}

// When Word of the Day is clicked, prompt for action.
document.getElementById('wotd').addEventListener('click', () => {
  const wotd = document.getElementById('wotd').textContent;
  let action = prompt("Enter 'D' to view definition or 'A' to add this word to your catalogue:","");
  if (action && action.toLowerCase() === 'd') {
    fetchDefinition(wotd);
  } else if (action && action.toLowerCase() === 'a') {
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
});

// Fetch definition via dictionaryapi.dev
function fetchDefinition(word) {
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
    .then(response => response.json())
    .then(data => {
      let definition = "Definition not found.";
      if (Array.isArray(data) && data[0].meanings && data[0].meanings.length > 0) {
        definition = data[0].meanings[0].definitions[0].definition;
      }
      showNotification(`Definition of "${word}": ${definition}`);
    })
    .catch(err => {
      console.error(err);
      showNotification(`Error fetching definition for "${word}".`);
    });
}

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
      helpText = "Practice Word: Toggle between Catalogue and Random modes using the Mode button. Click on the word to reveal it and (if sound is on) hear it. Revealing the word reduces the points earned. Use the sound icon to toggle audio.";
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
// On Initial Load
// ---------------------------
checkLogin();
