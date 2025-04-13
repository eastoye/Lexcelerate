// ---------------------------
// Import Firebase Firestore instance
// (Uncomment these lines if you are enabling Firebase cloud sync. Otherwise, you can leave them commented.)
// import { db } from "./firebaseConfig.js";
// import { doc, setDoc, getDoc } from "firebase/firestore";

// ---------------------------
// Global Variables for User & Catalogue
// ---------------------------
let currentUser = localStorage.getItem('currentUser');
let wordCatalogue = []; // Loaded per user
let randomTrials = [];  // For random practice stats
let practiceMode = 'catalogue';  // 'catalogue' or 'random'
let currentRevealCount = 0;        // For the current word
let wotdHandling = false;          // Guard flag for Word-of-the-Day clicks

// ---------------------------
// Cloud Sync Functions using Firestore (Optional)
// ---------------------------
async function saveCatalogueCloud() {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, "catalogues", currentUser), { catalogue: wordCatalogue });
    console.log("Catalogue saved to Firestore.");
  } catch (error) {
    console.error("Error saving catalogue: ", error);
  }
}

async function loadCatalogueCloud(callback) {
  if (!currentUser) return;
  try {
    const docSnap = await getDoc(doc(db, "catalogues", currentUser));
    if (docSnap.exists()) {
      wordCatalogue = docSnap.data().catalogue;
      localStorage.setItem("wordCatalogue_" + currentUser, JSON.stringify(wordCatalogue));
    } else {
      console.log("No catalogue found in Firestore.");
    }
    if (callback) callback();
  } catch (error) {
    console.error("Error loading catalogue: ", error);
    if (callback) callback();
  }
}

// ---------------------------
// Local Save/Load Functions (Augmented with Cloud Sync)
// ---------------------------
function saveCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    localStorage.setItem(key, JSON.stringify(wordCatalogue));
    // To enable cloud sync, uncomment the next line:
    // saveCatalogueCloud();
  }
}

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
    // To load from cloud sync, uncomment the next line:
    // loadCatalogueCloud();
  }
}

// ---------------------------
// Notification (Non-blocking)
// ---------------------------
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

// ---------------------------
// Word of the Day click event
// ---------------------------
document.getElementById('wotd').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
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
// fetchDefinition (with callback)
// ---------------------------
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
  let hintArray = syllables.map((syl, index) => index < syllablesToReveal ? syl : "_".repeat(syl.length));
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
  let html = wordCatalogue.length === 0
    ? '<p>No words added.</p>'
    : wordCatalogue.map((wordObj, i) => `
      <div class="word-stat">
        <strong>${wordObj.word}</strong> ${Object.keys(wordObj.mistakes).length > 0 ? '!' : ''}
        (Score: ${wordObj.score})
        <button class="toggle-details" data-index="${i}">▼</button>
        <button class="delete-word" data-index="${i}">Delete</button>
        <div class="details" id="details-${i}">
          <p>Total Attempts: ${wordObj.totalAttempts}</p>
          <p>Correct on First Try: ${wordObj.correctFirstTryCount}</p>
          <p>Streak: ${wordObj.streak}</p>
          ${Object.keys(wordObj.mistakes).length > 0 
            ? `<p>Mistakes:</p><ul>${Object.entries(wordObj.mistakes).map(([k,v]) => `<li>${k} : ${v} time(s)</li>`).join('')}</ul>`
            : `<p>No mistakes recorded.</p>`
          }
        </div>
      </div>`).join("");
  statsListDiv.innerHTML = html;
  document.querySelectorAll('.toggle-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.target.getAttribute('data-index');
      const detailsDiv = document.getElementById('details-' + idx);
      detailsDiv.style.display = (detailsDiv.style.display === 'block') ? 'none' : 'block';
      e.target.textContent = (detailsDiv.style.display === 'block') ? '▲' : '▼';
    });
  });
  document.querySelectorAll('.delete-word').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.target.getAttribute('data-index');
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
    html += randomTrials.map((trial) => `
      <div class="word-stat">
        <strong>${trial.word}</strong>
        <p>Attempts: ${trial.attempts} | Correct: ${trial.correct ? 'Yes' : 'No'}</p>
      </div>
    `).join("");
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
  document.querySelectorAll('.screen, #home-screen, #login-screen').forEach(screen => screen.style.display = 'none');
  document.getElementById(screenId).style.display = 'block';
  if (screenId === 'home-screen') updateProgressSummary();
  if (screenId === 'stats-screen') updateStatsList();
}

// ---------------------------
// Navigation Button Listeners
// ---------------------------
document.getElementById('add-word-btn').addEventListener('click', () => showScreen('add-word-screen'));
document.getElementById('practice-btn').addEventListener('click', () => {
  if (practiceMode === 'catalogue' && wordCatalogue.length === 0) { alert('Please add at least one word first!'); return; }
  showScreen('practice-screen');
  loadPracticeWord();
});
document.getElementById('stats-btn').addEventListener('click', () => showScreen('stats-screen'));
document.querySelectorAll('.back-btn').forEach(button => {
  button.addEventListener('click', () => showScreen('home-screen'));
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
    let totalWeight = 0, weights = [];
    wordCatalogue.forEach(wordObj => {
      let weight = (maxScore + 1) - wordObj.score;
      weights.push(weight);
      totalWeight += weight;
    });
    let random = Math.random() * totalWeight, cumulative = 0;
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
  const actualWord = currentWordObj.word;
  document.getElementById('prompt').textContent = getCoveredWord(actualWord);
  document.getElementById('feedback').textContent = '';
  document.getElementById('spell-input').value = '';
  attemptCount = 0;
  currentRevealCount = 0; // Reset counter for each new word
  document.getElementById('spell-input').disabled = false;
  if (soundEnabled) {
    const utterance = new SpeechSynthesisUtterance(actualWord);
    speechSynthesis.speak(utterance);
  }
}

// ---------------------------
// Dictionary Words for Random Mode
// ---------------------------
function getRandomDictionaryWord() {
  return { word: dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)] };
}

// ---------------------------
// Sound Toggle with Icon Change
// ---------------------------
document.getElementById('sound-toggle-btn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle-btn').textContent = soundEnabled ? "🔊" : "🔇";
});

// ---------------------------
// Reveal Word on Prompt Tap
// ---------------------------
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
// ---------------------------
document.getElementById('talk-btn').addEventListener('click', () => {
  const wordToSpeak = currentWordObj ? currentWordObj.word : "";
  if (!wordToSpeak) { alert("No word available to speak."); return; }
  const utterance = new SpeechSynthesisUtterance(wordToSpeak);
  speechSynthesis.speak(utterance);
});

// ---------------------------
// Enter Key Submission for Practice
// ---------------------------
document.getElementById('spell-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { 
    event.preventDefault(); 
    document.getElementById('submit-spelling-btn').click(); 
  }
});

// ---------------------------
// Practice Submission Handler for Catalogue Practice
// ---------------------------
document.getElementById('submit-spelling-btn').addEventListener('click', () => {
  const actualWord = currentWordObj.word;
  const userSpelling = document.getElementById('spell-input').value.trim();
  const feedbackEl = document.getElementById('feedback');
  
  if (userSpelling.toLowerCase() === actualWord.toLowerCase()) {
    feedbackEl.textContent = "Correct!";
    if (practiceMode === 'catalogue') {
      currentWordObj.totalAttempts++;
      currentWordObj.streak++;
      let basePoints = (currentWordObj.streak >= 10) ? 5 : (currentWordObj.streak >= 5) ? 2 : 1;
      const factor = Math.max(1 - 0.2 * currentRevealCount, 0.2);
      currentWordObj.score = Math.min(currentWordObj.score + (basePoints * factor), maxScore);
      if (attemptCount === 0) currentWordObj.correctFirstTryCount++;
      saveCatalogue();
      updateProgressSummary();
    } else {
      const trial = randomTrials.find(t => t.word.toLowerCase() === actualWord.toLowerCase());
      if (trial) trial.correct = true;
    }
    setTimeout(loadPracticeWord, 1500);
  } else {
    attemptCount++;
    feedbackEl.textContent = "Incorrect. Try again!";
    if (practiceMode === 'catalogue') {
      if (!currentWordObj.mistakes) currentWordObj.mistakes = {};
      const attemptLower = userSpelling.toLowerCase();
      if (attemptLower !== actualWord.toLowerCase()) {
        currentWordObj.mistakes[attemptLower] = (currentWordObj.mistakes[attemptLower] || 0) + 1;
      }
      currentWordObj.streak = 0;
      currentWordObj.score = Math.max(currentWordObj.score - (currentWordObj.score > 60 ? 2 : 1), 0);
      saveCatalogue();
    } else {
      const trial = randomTrials.find(t => t.word.toLowerCase() === actualWord.toLowerCase());
      if (trial) trial.attempts++;
      else randomTrials.push({ word: actualWord, attempts: 1, correct: false });
    }
    document.getElementById('prompt').textContent = (attemptCount < 3)
      ? getCoveredWord(actualWord)
      : generateSyllableHint(actualWord, attemptCount);
  }
});

// ---------------------------
// On Initial Load
// ---------------------------
checkLogin();
