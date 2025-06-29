// Global variables
let soundEnabled = true;
let wordCatalogue = [];
let practiceWords = [];
let currentWordIndex = 0;
let currentWord = null;
let sessionStats = {
  correct: 0,
  wrong: 0,
  total: 0
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  loadSoundPreference();
  loadWordCatalogue();
  initializePractice();
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
  });
  
  saveWordCatalogue();
}

// Save word catalogue to localStorage
function saveWordCatalogue() {
  localStorage.setItem('wordCatalogue', JSON.stringify(wordCatalogue));
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

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Initialize practice session
function initializePractice() {
  if (wordCatalogue.length === 0) {
    showEmptyState();
    return;
  }
  
  // Create shuffled copy of words for practice
  practiceWords = shuffleArray(wordCatalogue);
  currentWordIndex = 0;
  sessionStats = { correct: 0, wrong: 0, total: 0 };
  
  showPracticeArea();
  loadNextWord();
  updateSessionStats();
}

// Show empty state when no words available
function showEmptyState() {
  document.getElementById('practice-area').style.display = 'none';
  document.getElementById('completion-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
}

// Show practice area
function showPracticeArea() {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('completion-state').style.display = 'none';
  document.getElementById('practice-area').style.display = 'block';
}

// Show completion state
function showCompletionState() {
  document.getElementById('practice-area').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('completion-state').style.display = 'block';
  
  // Update completion stats
  document.getElementById('final-correct').textContent = sessionStats.correct;
  const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;
}

// Load next word for practice
function loadNextWord() {
  if (currentWordIndex >= practiceWords.length) {
    showCompletionState();
    return;
  }
  
  currentWord = practiceWords[currentWordIndex];
  
  // Display word
  document.getElementById('current-word').textContent = currentWord.word;
  document.getElementById('word-definition').textContent = currentWord.definition || 'No definition available';
  
  // Speak word if sound is enabled
  if (soundEnabled) {
    speakWord(currentWord.word);
  }
  
  // Enable action buttons
  document.getElementById('correct-btn').disabled = false;
  document.getElementById('wrong-btn').disabled = false;
}

// Speak word using text-to-speech
function speakWord(word) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  }
}

// Handle correct answer
function handleCorrectAnswer() {
  if (!currentWord) return;
  
  // Update word stats
  currentWord.score += 1;
  currentWord.streak += 1;
  
  // Update session stats
  sessionStats.correct += 1;
  sessionStats.total += 1;
  
  // Save changes
  saveWordCatalogue();
  updateSessionStats();
  
  // Show feedback
  showNotification(`Correct! Streak: ${currentWord.streak}`, 'success');
  
  // Move to next word
  setTimeout(() => {
    currentWordIndex++;
    loadNextWord();
  }, 1000);
  
  // Disable buttons temporarily
  disableActionButtons();
}

// Handle wrong answer
function handleWrongAnswer() {
  if (!currentWord) return;
  
  // Update word stats (reset streak, keep score)
  currentWord.streak = 0;
  
  // Update session stats
  sessionStats.wrong += 1;
  sessionStats.total += 1;
  
  // Save changes
  saveWordCatalogue();
  updateSessionStats();
  
  // Show feedback
  showNotification(`Keep practicing! "${currentWord.word}" - ${currentWord.definition}`, 'warning');
  
  // Move to next word
  setTimeout(() => {
    currentWordIndex++;
    loadNextWord();
  }, 2000);
  
  // Disable buttons temporarily
  disableActionButtons();
}

// Disable action buttons temporarily
function disableActionButtons() {
  document.getElementById('correct-btn').disabled = true;
  document.getElementById('wrong-btn').disabled = true;
}

// Update session statistics display
function updateSessionStats() {
  document.getElementById('session-correct').textContent = sessionStats.correct;
  document.getElementById('session-wrong').textContent = sessionStats.wrong;
  document.getElementById('session-total').textContent = sessionStats.total;
  
  const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
  document.getElementById('session-accuracy').textContent = `${accuracy}%`;
}

// Restart practice session
function restartPractice() {
  currentWordIndex = 0;
  sessionStats = { correct: 0, wrong: 0, total: 0 };
  practiceWords = shuffleArray(wordCatalogue);
  
  showPracticeArea();
  loadNextWord();
  updateSessionStats();
  
  showNotification('Practice session restarted!', 'info');
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

  // Speak word button
  document.getElementById('speak-word-btn').addEventListener('click', () => {
    if (currentWord) {
      speakWord(currentWord.word);
    }
  });

  // Action buttons
  document.getElementById('correct-btn').addEventListener('click', handleCorrectAnswer);
  document.getElementById('wrong-btn').addEventListener('click', handleWrongAnswer);

  // Empty state button
  document.getElementById('add-words-btn').addEventListener('click', () => {
    window.location.href = 'add-word.html';
  });

  // Completion state buttons
  document.getElementById('restart-btn').addEventListener('click', restartPractice);
  document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
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
        case 3: // Stats
          window.location.href = 'stats.html';
          break;
      }
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('practice-area').style.display !== 'none') {
      switch(e.key) {
        case '1':
        case 'ArrowLeft':
          if (!document.getElementById('correct-btn').disabled) {
            handleCorrectAnswer();
          }
          break;
        case '2':
        case 'ArrowRight':
          if (!document.getElementById('wrong-btn').disabled) {
            handleWrongAnswer();
          }
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (currentWord) {
            speakWord(currentWord.word);
          }
          break;
      }
    }
  });
}