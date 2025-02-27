// ---------------------------
// Global Variables for User & Catalogue
// ---------------------------
let currentUser = localStorage.getItem('currentUser');
let wordCatalogue = []; // Will be loaded per user

// Load the current user's catalogue from localStorage (or initialize it)
function loadUserCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    wordCatalogue = JSON.parse(localStorage.getItem(key)) || [];
    // Ensure each word object has required properties (including ranking properties)
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

// Save the current user's catalogue to localStorage.
function saveCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    localStorage.setItem(key, JSON.stringify(wordCatalogue));
  }
}

// ---------------------------
// Notification Function (Non-blocking)
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
// Global Variables for Practice Session & Sound Toggle
// ---------------------------
let attemptCount = 0;
let currentWordObj = null;
let soundEnabled = true; // Sound is ON by default

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
                <strong>${wordObj.word}</strong> (Score: ${wordObj.score})
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

  // Add event listeners for toggling details and deleting words.
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

function showScreen(screenId) {
  document.querySelectorAll('.screen, #home-screen, #login-screen').forEach(screen => {
    screen.style.display = 'none';
  });
  document.getElementById(screenId).style.display = 'block';
  if (screenId === 'home-screen') updateProgressSummary();
  if (screenId === 'stats-screen') updateStatsList();
}

// ---------------------------
// Navigation Event Listeners
// ---------------------------
document.getElementById('add-word-btn').addEventListener('click', () => { showScreen('add-word-screen'); });
document.getElementById('practice-btn').addEventListener('click', () => {
  if (wordCatalogue.length === 0) { alert('Please add at least one word first!'); return; }
  showScreen('practice-screen');
  loadPracticeWord();
});
document.getElementById('stats-btn').addEventListener('click', () => { showScreen('stats-screen'); });
document.querySelectorAll('.back-btn').forEach(button => {
  button.addEventListener('click', () => { showScreen('home-screen'); });
});

// ---------------------------
// Add Word Functionality with Export/Import Features
// ---------------------------
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

document.getElementById('export-btn').addEventListener('click', () => {
  const exportData = JSON.stringify(wordCatalogue, null, 2);
  // Copy to clipboard:
  navigator.clipboard.writeText(exportData).then(() => {
    showNotification("Catalogue exported to clipboard");
  }, () => {
    alert("Failed to copy to clipboard.");
  });
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
// Adaptive Learning with Ranking System
// ---------------------------
const maxScore = 100;
function getRandomWord() {
  let totalWeight = 0;
  let weights = [];
  wordCatalogue.forEach(wordObj => {
    // Weight formula: lower score gives higher weight.
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

// ---------------------------
// Load Practice Word & Sound Toggle/Reveal
// ---------------------------
function loadPracticeWord() {
  currentWordObj = getRandomWord();
  let actualWord = currentWordObj.word;
  document.getElementById('prompt').textContent = getCoveredWord(actualWord);
  document.getElementById('feedback').textContent = '';
  document.getElementById('spell-input').value = '';
  attemptCount = 0;
  document.getElementById('spell-input').disabled = false;
  if (soundEnabled) {
    const utterance = new SpeechSynthesisUtterance(actualWord);
    speechSynthesis.speak(utterance);
  }
}

// ---------------------------
// Sound Toggle
// ---------------------------
document.getElementById('sound-toggle-btn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle-btn').textContent = soundEnabled ? "Sound: ON" : "Sound: OFF";
});

// ---------------------------
// Reveal Word on Prompt Tap when Sound OFF
// ---------------------------
document.getElementById('prompt').addEventListener('click', () => {
  if (!soundEnabled && currentWordObj) {
    document.getElementById('prompt').textContent = currentWordObj.word;
    const spellInput = document.getElementById('spell-input');
    spellInput.value = "";
    spellInput.disabled = true;
    setTimeout(() => {
      document.getElementById('prompt').textContent = getCoveredWord(currentWordObj.word);
      spellInput.disabled = false;
    }, 3000);
  }
});

// ---------------------------
// Talk Button (Always speaks the word)
document.getElementById('talk-btn').addEventListener('click', () => {
  const wordToSpeak = currentWordObj ? currentWordObj.word : "";
  if (!wordToSpeak) { alert("No word available to speak."); return; }
  const utterance = new SpeechSynthesisUtterance(wordToSpeak);
  speechSynthesis.speak(utterance);
});

// ---------------------------
// Enter Key Submission for Spell Input
// ---------------------------
document.getElementById('spell-input').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('submit-spelling-btn').click();
  }
});

// ---------------------------
// Practice Submission Handler with Ranking Updates
// ---------------------------
document.getElementById('submit-spelling-btn').addEventListener('click', () => {
  let actualWord = currentWordObj.word;
  const userSpelling = document.getElementById('spell-input').value.trim();
  const feedbackEl = document.getElementById('feedback');
  
  if (userSpelling.toLowerCase() === actualWord.toLowerCase()) {
    feedbackEl.textContent = "Correct!";
    currentWordObj.totalAttempts++;
    currentWordObj.streak++;
    if (currentWordObj.streak >= 10) {
      currentWordObj.score += 5;
    } else if (currentWordObj.streak >= 5) {
      currentWordObj.score += 2;
    } else {
      currentWordObj.score += 1;
    }
    if (currentWordObj.score > maxScore) currentWordObj.score = maxScore;
    if (attemptCount === 0) currentWordObj.correctFirstTryCount++;
    saveCatalogue();
    updateProgressSummary();
    setTimeout(loadPracticeWord, 1500);
  } else {
    attemptCount++;
    feedbackEl.textContent = "Incorrect. Try again!";
    if (!currentWordObj.mistakes) currentWordObj.mistakes = {};
    let attemptLower = userSpelling.toLowerCase();
    if (attemptLower !== actualWord.toLowerCase()) {
      currentWordObj.mistakes[attemptLower] = (currentWordObj.mistakes[attemptLower] || 0) + 1;
    }
    // Reset streak and subtract points:
    currentWordObj.streak = 0;
    if (currentWordObj.score > 60) {
      currentWordObj.score -= 2;
    } else {
      currentWordObj.score -= 1;
    }
    if (currentWordObj.score < 0) currentWordObj.score = 0;
    saveCatalogue();
    if (attemptCount < 3) {
      document.getElementById('prompt').textContent = getCoveredWord(actualWord);
    } else {
      document.getElementById('prompt').textContent = generateSyllableHint(actualWord, attemptCount);
    }
  }
});

// ---------------------------
// Word of the Day (Placeholder Implementation)
// ---------------------------
function loadWordOfTheDay() {
  // For now, randomly pick a word from a fixed list or from your catalogue.
  // In the future, you could use an external API (e.g., Wordnik's API) after checking their terms.
  const defaultWords = ["serendipity", "eloquence", "ephemeral", "labyrinth", "mellifluous"];
  let wotd = defaultWords[Math.floor(Math.random() * defaultWords.length)];
  // Alternatively, if your catalogue is not empty, pick one from there.
  if (wordCatalogue.length > 0) {
    wotd = wordCatalogue[Math.floor(Math.random() * wordCatalogue.length)].word;
  }
  document.getElementById('wotd').textContent = wotd;
}
loadWordOfTheDay();

// ---------------------------
// Help Button & Modal Functionality
// ---------------------------
document.getElementById('help-btn').addEventListener('click', () => {
  // Set help text based on the current visible screen.
  let helpText = "";
  const currentScreen = document.querySelector('.screen:not([style*="display: none"]), #home-screen:not([style*="display: none"]), #login-screen:not([style*="display: none"])');
  if (currentScreen.id === "login-screen") {
    helpText = "Enter your username and password to sign in. (Any values are accepted in this demo.)";
  } else if (currentScreen.id === "home-screen") {
    helpText = "This is the home page. Use the buttons to add words, practice spelling, or view your word stats. The Word of the Day is displayed at the top.";
  } else if (currentScreen.id === "add-word-screen") {
    helpText = "Enter a new word to add to your catalogue. Click 'Save Word' to add it. Your catalogue is unique to your account.";
  } else if (currentScreen.id === "practice-screen") {
    helpText = "Practice spelling words. Use the 'Sound' button to toggle audio. If sound is off, tap the word (covered) to reveal it briefly. Then, type your answer and press 'Submit' (or Enter).";
  } else if (currentScreen.id === "stats-screen") {
    helpText = "View detailed statistics for each word. Click the ▼ button to expand details, or the Delete button to remove a word. Use Export/Import buttons to copy or paste your catalogue.";
  }
  document.getElementById('help-text').innerHTML = `<p>${helpText}</p>`;
  document.getElementById('help-modal').style.display = 'block';
});

document.getElementById('help-close').addEventListener('click', () => {
  document.getElementById('help-modal').style.display = 'none';
});

// Close modal if user clicks outside of modal content.
window.addEventListener('click', (event) => {
  const modal = document.getElementById('help-modal');
  if (event.target == modal) {
    modal.style.display = 'none';
  }
});

// ---------------------------
// On Initial Load, Check Login
// ---------------------------
checkLogin();
