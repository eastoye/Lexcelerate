/**
 * Lexcelerate - Core Application Logic
 * 
 * This module contains the main application functionality including:
 * - Word management and practice logic
 * - Audio feedback system
 * - Progress tracking and statistics
 * - UI interaction handlers
 * - Smart list generation utilities
 */

// ---------------------------
// Application State Management
// ---------------------------

/**
 * Global application state
 */
const AppState = {
  currentUser: null,
  wordCatalogue: [],
  randomTrials: [],
  practiceMode: 'catalogue',
  currentRevealCount: 0,
  attemptCount: 0,
  currentWordObj: null,
  soundEnabled: true,
  successAudio: null
};

// Make wordCatalogue globally accessible for backward compatibility
window.wordCatalogue = AppState.wordCatalogue;

// ---------------------------
// Audio System
// ---------------------------

/**
 * Audio feedback manager
 */
class AudioManager {
  constructor() {
    this.successAudio = null;
    this.isInitialized = false;
  }

  /**
   * Initialize audio system
   */
  initialize() {
    if (this.isInitialized) return;
    
    try {
      this.successAudio = new Audio('./correctbell.wav');
      this.successAudio.volume = 0.3;
      this.successAudio.preload = 'auto';
      this.isInitialized = true;
    } catch (error) {
      console.warn('Could not load success audio:', error);
    }
  }

  /**
   * Play success sound if enabled
   */
  playSuccess() {
    if (!this.successAudio || !AppState.soundEnabled || !this.isInitialized) {
      return;
    }

    try {
      this.successAudio.currentTime = 0;
      this.successAudio.play().catch(error => {
        console.warn('Could not play success audio:', error);
      });
    } catch (error) {
      console.warn('Error playing success audio:', error);
    }
  }
}

const audioManager = new AudioManager();

// ---------------------------
// Word of the Day System
// ---------------------------

/**
 * Word of the Day manager
 */
class WordOfTheDayManager {
  constructor() {
    this.defaultWords = [
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
    this.isHandling = false;
  }

  /**
   * Load and display word of the day
   */
  load() {
    const storedWord = localStorage.getItem('wotd');
    const timestamp = localStorage.getItem('wotdTimestamp');
    const now = Date.now();
    const oneDayMs = 86400000; // 24 hours in milliseconds

    if (storedWord && timestamp && (now - parseInt(timestamp) < oneDayMs)) {
      this.displayWord(storedWord);
    } else {
      const newWord = this.selectRandomWord();
      localStorage.setItem('wotd', newWord);
      localStorage.setItem('wotdTimestamp', now.toString());
      this.displayWord(newWord);
    }
  }

  /**
   * Select a random word from the default list
   */
  selectRandomWord() {
    const randomIndex = Math.floor(Math.random() * this.defaultWords.length);
    return this.defaultWords[randomIndex];
  }

  /**
   * Display the word in the UI
   */
  displayWord(word) {
    const wotdElement = document.getElementById('wotd');
    if (wotdElement) {
      wotdElement.textContent = word;
    }
  }

  /**
   * Handle word of the day click interaction
   */
  async handleClick() {
    if (this.isHandling) return;
    
    this.isHandling = true;
    const wotdElement = document.getElementById('wotd');
    const word = wotdElement?.textContent;

    if (!word) {
      this.isHandling = false;
      return;
    }

    try {
      const definition = await this.fetchDefinition(word);
      const shouldAdd = confirm(`Definition: ${definition}\n\nWould you like to add this word to your catalogue?`);
      
      if (shouldAdd) {
        this.addToCatalogue(word);
      }
    } catch (error) {
      console.error('Error handling word of the day click:', error);
    } finally {
      this.isHandling = false;
    }
  }

  /**
   * Fetch definition from dictionary API
   */
  async fetchDefinition(word) {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await response.json();
      
      if (Array.isArray(data) && data[0]?.meanings?.[0]?.definitions?.[0]) {
        return data[0].meanings[0].definitions[0].definition;
      }
      
      return "Definition not found.";
    } catch (error) {
      console.error('Error fetching definition:', error);
      return "Error fetching definition.";
    }
  }

  /**
   * Add word to catalogue if not already present
   */
  addToCatalogue(word) {
    const wordLower = word.toLowerCase();
    const exists = AppState.wordCatalogue.find(w => w.word.toLowerCase() === wordLower);
    
    if (!exists) {
      const newWord = WordManager.createWordObject(word);
      AppState.wordCatalogue.push(newWord);
      this.saveCatalogue();
      NotificationManager.show(`"${word}" added to your catalogue`);
      ProgressManager.updateSummary();
    } else {
      NotificationManager.show(`"${word}" is already in your catalogue`);
    }
  }

  /**
   * Save catalogue using global save function
   */
  saveCatalogue() {
    if (window.saveUserCatalogueToSupabase) {
      window.saveUserCatalogueToSupabase();
    }
  }
}

const wordOfTheDayManager = new WordOfTheDayManager();

// ---------------------------
// Word Management System
// ---------------------------

/**
 * Word management utilities
 */
class WordManager {
  /**
   * Create a new word object with default properties
   */
  static createWordObject(word) {
    return {
      word: word,
      totalAttempts: 0,
      correctFirstTryCount: 0,
      mistakes: {},
      nextReview: Date.now(),
      interval: 1,
      score: 0,
      streak: 0
    };
  }

  /**
   * Get covered representation of a word
   */
  static getCoveredWord(word) {
    return "_".repeat(word.length);
  }

  /**
   * Split word into syllables for hints
   */
  static splitIntoSyllables(word) {
    const syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+|$)/gi);
    return syllables || [word];
  }

  /**
   * Generate syllable hint based on attempt count
   */
  static generateSyllableHint(word, attemptCount) {
    const syllables = this.splitIntoSyllables(word);
    const syllablesToReveal = Math.min(attemptCount - 2, syllables.length);
    
    return syllables.map((syllable, index) => {
      return index < syllablesToReveal ? syllable : "_".repeat(syllable.length);
    }).join("-");
  }

  /**
   * Get random word based on current practice mode
   */
  static getRandomWord() {
    if (AppState.practiceMode === 'random') {
      return this.getRandomDictionaryWord();
    }
    
    return this.getWeightedRandomWord();
  }

  /**
   * Get random dictionary word for random practice
   */
  static getRandomDictionaryWord() {
    const dictionaryWords = ["quixotic", "serendipity", "benevolent", "obfuscate", "pulchritude"];
    const randomIndex = Math.floor(Math.random() * dictionaryWords.length);
    return { word: dictionaryWords[randomIndex] };
  }

  /**
   * Get weighted random word from catalogue (lower scores have higher probability)
   */
  static getWeightedRandomWord() {
    if (AppState.wordCatalogue.length === 0) {
      return this.getRandomDictionaryWord();
    }

    const maxScore = 100;
    let totalWeight = 0;
    const weights = [];

    // Calculate weights (inverse of score for lower-scoring words to appear more)
    AppState.wordCatalogue.forEach(wordObj => {
      const weight = (maxScore + 1) - wordObj.score;
      weights.push(weight);
      totalWeight += weight;
    });

    // Select random word based on weights
    const random = Math.random() * totalWeight;
    let cumulative = 0;
    
    for (let i = 0; i < AppState.wordCatalogue.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return AppState.wordCatalogue[i];
      }
    }

    return AppState.wordCatalogue[0];
  }
}

// ---------------------------
// Practice Session Manager
// ---------------------------

/**
 * Practice session management
 */
class PracticeManager {
  /**
   * Load a new practice word
   */
  static loadPracticeWord() {
    if (AppState.practiceMode === 'random') {
      AppState.currentWordObj = WordManager.getRandomWord();
      this.handleRandomTrialTracking();
    } else {
      AppState.currentWordObj = WordManager.getRandomWord();
    }

    this.resetPracticeUI();
    this.speakWord();
  }

  /**
   * Handle tracking for random word trials
   */
  static handleRandomTrialTracking() {
    const word = AppState.currentWordObj.word;
    const existing = AppState.randomTrials.find(t => 
      t.word.toLowerCase() === word.toLowerCase()
    );

    if (existing) {
      existing.attempts = 0;
      existing.correct = false;
    } else {
      AppState.randomTrials.push({ 
        word: word, 
        attempts: 0, 
        correct: false 
      });
    }
  }

  /**
   * Reset practice UI elements
   */
  static resetPracticeUI() {
    const actualWord = AppState.currentWordObj.word;
    const promptElement = document.getElementById('prompt');
    const feedbackElement = document.getElementById('feedback');
    const inputElement = document.getElementById('spell-input');

    if (promptElement) {
      promptElement.textContent = WordManager.getCoveredWord(actualWord);
    }
    if (feedbackElement) {
      feedbackElement.textContent = '';
    }
    if (inputElement) {
      inputElement.value = '';
      inputElement.disabled = false;
    }

    AppState.attemptCount = 0;
    AppState.currentRevealCount = 0;
  }

  /**
   * Speak the current word if sound is enabled
   */
  static speakWord() {
    if (AppState.soundEnabled && AppState.currentWordObj) {
      const utterance = new SpeechSynthesisUtterance(AppState.currentWordObj.word);
      speechSynthesis.speak(utterance);
    }
  }

  /**
   * Handle spelling submission
   */
  static handleSpellingSubmission() {
    if (!AppState.currentWordObj) return;

    const actualWord = AppState.currentWordObj.word;
    const inputElement = document.getElementById('spell-input');
    const userSpelling = inputElement?.value.trim() || '';
    
    if (this.isSpellingCorrect(userSpelling, actualWord)) {
      this.handleCorrectSpelling();
    } else {
      this.handleIncorrectSpelling(userSpelling, actualWord);
    }
  }

  /**
   * Check if spelling is correct
   */
  static isSpellingCorrect(userSpelling, actualWord) {
    return userSpelling.toLowerCase() === actualWord.toLowerCase();
  }

  /**
   * Handle correct spelling
   */
  static handleCorrectSpelling() {
    const feedbackElement = document.getElementById('feedback');
    if (feedbackElement) {
      feedbackElement.textContent = "Correct!";
    }

    audioManager.playSuccess();

    if (AppState.practiceMode === 'catalogue') {
      this.updateWordStatistics(true);
    } else {
      this.updateRandomTrialStatistics(true);
    }

    // Load next word after delay
    setTimeout(() => {
      this.loadPracticeWord();
    }, 1500);
  }

  /**
   * Handle incorrect spelling
   */
  static handleIncorrectSpelling(userSpelling, actualWord) {
    AppState.attemptCount++;
    
    const feedbackElement = document.getElementById('feedback');
    if (feedbackElement) {
      feedbackElement.textContent = "Incorrect. Try again!";
    }

    if (AppState.practiceMode === 'catalogue') {
      this.updateWordStatistics(false, userSpelling);
    } else {
      this.updateRandomTrialStatistics(false);
    }

    this.updatePromptWithHint(actualWord);
  }

  /**
   * Update word statistics for catalogue practice
   */
  static updateWordStatistics(isCorrect, incorrectSpelling = null) {
    const wordObj = AppState.currentWordObj;
    
    if (isCorrect) {
      wordObj.totalAttempts++;
      wordObj.streak++;
      
      // Calculate points based on streak and reveals
      let basePoints = wordObj.streak >= 10 ? 5 : (wordObj.streak >= 5 ? 2 : 1);
      const revealPenalty = Math.max(1 - 0.2 * AppState.currentRevealCount, 0.2);
      const pointsAwarded = basePoints * revealPenalty;
      
      wordObj.score = Math.min(wordObj.score + pointsAwarded, 100);
      
      if (AppState.attemptCount === 0) {
        wordObj.correctFirstTryCount++;
      }
    } else {
      // Handle incorrect attempt
      if (incorrectSpelling && incorrectSpelling.toLowerCase() !== wordObj.word.toLowerCase()) {
        if (!wordObj.mistakes) wordObj.mistakes = {};
        const mistake = incorrectSpelling.toLowerCase();
        wordObj.mistakes[mistake] = (wordObj.mistakes[mistake] || 0) + 1;
      }
      
      wordObj.streak = 0;
      const penalty = wordObj.score > 60 ? 2 : 1;
      wordObj.score = Math.max(wordObj.score - penalty, 0);
    }

    this.saveCatalogue();
    if (window.refreshSmartList) {
      window.refreshSmartList();
    }
  }

  /**
   * Update random trial statistics
   */
  static updateRandomTrialStatistics(isCorrect) {
    const word = AppState.currentWordObj.word;
    const trial = AppState.randomTrials.find(t => 
      t.word.toLowerCase() === word.toLowerCase()
    );

    if (trial) {
      if (isCorrect) {
        trial.correct = true;
      } else {
        trial.attempts++;
      }
    }
  }

  /**
   * Update prompt with hint based on attempt count
   */
  static updatePromptWithHint(actualWord) {
    const promptElement = document.getElementById('prompt');
    if (!promptElement) return;

    if (AppState.attemptCount < 3) {
      promptElement.textContent = WordManager.getCoveredWord(actualWord);
    } else {
      const hint = WordManager.generateSyllableHint(actualWord, AppState.attemptCount);
      promptElement.textContent = hint;
    }
  }

  /**
   * Save catalogue
   */
  static saveCatalogue() {
    if (window.saveUserCatalogueToSupabase) {
      window.saveUserCatalogueToSupabase();
    }
  }
}

// ---------------------------
// Progress and Statistics Management
// ---------------------------

/**
 * Progress tracking and statistics
 */
class ProgressManager {
  /**
   * Update overall progress summary
   */
  static updateSummary() {
    const summaryElement = document.getElementById('progress-summary');
    if (!summaryElement) return;

    let totalAttempts = 0;
    let totalCorrectFirstTry = 0;

    AppState.wordCatalogue.forEach(wordObj => {
      totalAttempts += wordObj.totalAttempts;
      totalCorrectFirstTry += wordObj.correctFirstTryCount;
    });

    const progress = totalAttempts > 0 
      ? ((totalCorrectFirstTry / totalAttempts) * 100).toFixed(1) 
      : 0;

    summaryElement.textContent = `Overall First-Attempt Accuracy: ${progress}%`;
  }

  /**
   * Update statistics list
   */
  static updateStatsList() {
    this.updateStatsSummary();
    this.renderStatsList(AppState.wordCatalogue);
  }

  /**
   * Update statistics summary cards
   */
  static updateStatsSummary() {
    const elements = {
      totalWords: document.getElementById('total-words'),
      averageScore: document.getElementById('average-score'),
      bestStreak: document.getElementById('best-streak')
    };

    if (!elements.totalWords || !elements.averageScore || !elements.bestStreak) {
      return;
    }

    // Calculate statistics
    const totalWords = AppState.wordCatalogue.length;
    elements.totalWords.textContent = totalWords;

    let averageScore = 0;
    if (totalWords > 0) {
      const totalScore = AppState.wordCatalogue.reduce((sum, word) => sum + (word.score || 0), 0);
      averageScore = Math.round(totalScore / totalWords);
    }
    elements.averageScore.textContent = averageScore;

    const bestStreak = AppState.wordCatalogue.reduce((max, word) => {
      const streak = word.streak || 0;
      return streak > max ? streak : max;
    }, 0);
    elements.bestStreak.textContent = bestStreak;
  }

  /**
   * Render statistics list
   */
  static renderStatsList(words) {
    const statsListElement = document.getElementById('stats-list');
    if (!statsListElement) return;

    if (!words || words.length === 0) {
      statsListElement.innerHTML = '<p class="no-words">No words added yet.</p>';
      return;
    }

    const html = words.map((wordObj, index) => {
      const mistakeCount = Object.keys(wordObj.mistakes || {}).length;
      const hasDetails = wordObj.totalAttempts > 0 || mistakeCount > 0;

      return `
        <div class="word-stat-item" data-word="${this.escapeHtml(wordObj.word.toLowerCase())}">
          <div class="word-stat-header">
            <div class="word-info">
              <button class="toggle-details" data-word-index="${index}" aria-label="Toggle details for ${this.escapeHtml(wordObj.word)}">
                <span>${this.escapeHtml(wordObj.word.toLowerCase())}</span>
              </button>
            </div>
            <div class="word-score"><span>${wordObj.score || 0}</span></div>
            <button class="delete-word" data-word-index="${index}" aria-label="Delete word">×</button>
          </div>
          ${hasDetails ? this.renderWordDetails(wordObj, index) : ''}
        </div>
      `;
    }).join('');

    statsListElement.innerHTML = html;
  }

  /**
   * Render word details section
   */
  static renderWordDetails(wordObj, index) {
    const mistakeCount = Object.keys(wordObj.mistakes || {}).length;
    
    return `
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
        ${mistakeCount > 0 ? this.renderMistakesSection(wordObj.mistakes) : ''}
      </div>
    `;
  }

  /**
   * Render mistakes section
   */
  static renderMistakesSection(mistakes) {
    const mistakeItems = Object.entries(mistakes).map(([mistake, count]) => `
      <div class="mistake-item">
        <span class="mistake-word">${this.escapeHtml(mistake)}</span>
        <span class="mistake-count">${count}x</span>
      </div>
    `).join('');

    return `
      <div class="mistakes-section">
        <div class="mistakes-title">Common Mistakes</div>
        ${mistakeItems}
      </div>
    `;
  }

  /**
   * Update random statistics list
   */
  static updateRandomStatsList() {
    const randomStatsElement = document.getElementById('random-stats');
    if (!randomStatsElement) return;

    let html = '<h3>Random Word Trials</h3>';
    
    if (AppState.randomTrials.length === 0) {
      html += '<p>No random word trials recorded.</p>';
    } else {
      html += AppState.randomTrials.map(trial => `
        <div class="word-stat">
          <strong>${trial.word}</strong>
          <p>Attempts: ${trial.attempts} | Correct: ${trial.correct ? 'Yes' : 'No'}</p>
        </div>
      `).join('');
    }

    randomStatsElement.innerHTML = html;
  }

  /**
   * Escape HTML to prevent XSS
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ---------------------------
// Smart List Utilities
// ---------------------------

/**
 * Smart list generation utilities
 */
class SmartListManager {
  /**
   * Get smart list of words based on criteria
   */
  static getSmartList(n, source = 'all') {
    if (!AppState.wordCatalogue || AppState.wordCatalogue.length === 0) {
      return [];
    }

    let filteredWords = [...AppState.wordCatalogue];

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

  /**
   * Update smart list display
   */
  static updateSmartList() {
    const nInput = document.getElementById('smart-list-n');
    const sourceSelect = document.getElementById('smart-list-source');
    const smartListDiv = document.getElementById('smart-list-display');

    if (!nInput || !sourceSelect || !smartListDiv) return;

    const n = parseInt(nInput.value) || 10;
    const source = sourceSelect.value;
    const smartWords = this.getSmartList(n, source);

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

  /**
   * Refresh smart list display
   */
  static refreshSmartList() {
    if (document.getElementById('smart-list-display')) {
      this.updateSmartList();
    }
  }
}

// ---------------------------
// Notification System
// ---------------------------

/**
 * Notification management
 */
class NotificationManager {
  /**
   * Show notification message
   */
  static show(message) {
    const notificationElement = document.getElementById('notification');
    if (!notificationElement) return;

    notificationElement.textContent = message;
    notificationElement.style.display = 'block';
    
    setTimeout(() => {
      notificationElement.style.display = 'none';
    }, 2000);
  }
}

// ---------------------------
// Screen Navigation
// ---------------------------

/**
 * Screen navigation management
 */
class ScreenManager {
  /**
   * Show specified screen and hide others
   */
  static showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen, #home-screen, #login-screen').forEach(screen => {
      screen.style.display = 'none';
    });

    // Handle renamed auth screen
    if (screenId === 'login-screen') {
      screenId = 'auth-screen';
    }

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.style.display = 'block';
    }

    // Handle screen-specific initialization
    this.handleScreenInitialization(screenId);
  }

  /**
   * Handle screen-specific initialization
   */
  static handleScreenInitialization(screenId) {
    switch (screenId) {
      case 'home-screen':
        ProgressManager.updateSummary();
        break;
      case 'stats-screen':
        ProgressManager.updateStatsList();
        ProgressManager.updateStatsSummary();
        SmartListManager.updateSmartList();
        break;
    }
  }
}

// ---------------------------
// Event Handlers Setup
// ---------------------------

/**
 * Event handlers management
 */
class EventHandlers {
  /**
   * Initialize all event handlers
   */
  static initialize() {
    this.setupNavigationHandlers();
    this.setupWordManagementHandlers();
    this.setupPracticeHandlers();
    this.setupStatisticsHandlers();
    this.setupHelpHandlers();
    this.setupImportExportHandlers();
  }

  /**
   * Setup navigation event handlers
   */
  static setupNavigationHandlers() {
    const handlers = [
      { id: 'add-word-btn', action: () => ScreenManager.showScreen('add-word-screen') },
      { id: 'practice-btn', action: () => this.handlePracticeNavigation() },
      { id: 'stats-btn', action: () => ScreenManager.showScreen('stats-screen') }
    ];

    handlers.forEach(({ id, action }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', action);
      }
    });

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(button => {
      button.addEventListener('click', () => ScreenManager.showScreen('home-screen'));
    });
  }

  /**
   * Handle practice navigation with validation
   */
  static handlePracticeNavigation() {
    if (AppState.practiceMode === 'catalogue' && AppState.wordCatalogue.length === 0) {
      alert('Please add at least one word first!');
      return;
    }
    ScreenManager.showScreen('practice-screen');
    PracticeManager.loadPracticeWord();
  }

  /**
   * Setup word management handlers
   */
  static setupWordManagementHandlers() {
    const saveWordBtn = document.getElementById('save-word-btn');
    if (saveWordBtn) {
      saveWordBtn.addEventListener('click', this.handleAddWord);
    }

    // Word of the Day click handler
    const wotdElement = document.getElementById('wotd');
    if (wotdElement) {
      wotdElement.addEventListener('click', () => wordOfTheDayManager.handleClick());
    }
  }

  /**
   * Handle adding new word to catalogue
   */
  static handleAddWord() {
    const wordInput = document.getElementById('word-input');
    const word = wordInput?.value.trim();

    if (!word) {
      alert('Please enter a valid word.');
      return;
    }

    const newWord = WordManager.createWordObject(word);
    AppState.wordCatalogue.push(newWord);
    
    if (window.saveUserCatalogueToSupabase) {
      window.saveUserCatalogueToSupabase();
    }
    
    wordInput.value = '';
    NotificationManager.show(`"${word}" added`);
    ProgressManager.updateSummary();
  }

  /**
   * Setup practice-related handlers
   */
  static setupPracticeHandlers() {
    // Sound toggle
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', this.handleSoundToggle);
    }

    // Talk button
    const talkBtn = document.getElementById('talk-btn');
    if (talkBtn) {
      talkBtn.addEventListener('click', this.handleTalkButton);
    }

    // Prompt reveal
    const promptElement = document.getElementById('prompt');
    if (promptElement) {
      promptElement.addEventListener('click', this.handlePromptReveal);
    }

    // Spelling submission
    const submitBtn = document.getElementById('submit-spelling-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => PracticeManager.handleSpellingSubmission());
    }

    // Enter key for spelling input
    const spellInput = document.getElementById('spell-input');
    if (spellInput) {
      spellInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          PracticeManager.handleSpellingSubmission();
        }
      });
    }
  }

  /**
   * Handle sound toggle
   */
  static handleSoundToggle() {
    AppState.soundEnabled = !AppState.soundEnabled;
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
      soundToggleBtn.textContent = AppState.soundEnabled ? "🔊" : "🔇";
    }
  }

  /**
   * Handle talk button
   */
  static handleTalkButton() {
    if (!AppState.currentWordObj) {
      alert("No word available to speak.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(AppState.currentWordObj.word);
    speechSynthesis.speak(utterance);
  }

  /**
   * Handle prompt reveal
   */
  static handlePromptReveal() {
    if (!AppState.currentWordObj) return;

    const promptElement = document.getElementById('prompt');
    const spellInput = document.getElementById('spell-input');

    if (promptElement) {
      promptElement.textContent = AppState.currentWordObj.word;
    }

    if (AppState.soundEnabled) {
      PracticeManager.speakWord();
    }

    if (spellInput) {
      spellInput.value = "";
      spellInput.disabled = true;
    }

    AppState.currentRevealCount++;

    setTimeout(() => {
      if (promptElement) {
        promptElement.textContent = WordManager.getCoveredWord(AppState.currentWordObj.word);
      }
      if (spellInput) {
        spellInput.disabled = false;
      }
    }, 3000);
  }

  /**
   * Setup statistics handlers
   */
  static setupStatisticsHandlers() {
    // Toggle details and delete word handlers are set up via event delegation
    document.addEventListener('click', this.handleStatisticsClick);

    // Random stats toggle
    const toggleRandomStatsBtn = document.getElementById('toggle-random-stats-btn');
    if (toggleRandomStatsBtn) {
      toggleRandomStatsBtn.addEventListener('click', this.handleRandomStatsToggle);
    }
  }

  /**
   * Handle statistics-related clicks (event delegation)
   */
  static handleStatisticsClick(e) {
    // Handle toggle details
    if (e.target.closest('.toggle-details')) {
      const wordIndex = e.target.closest('.toggle-details').getAttribute('data-word-index');
      const detailsDiv = document.getElementById(`details-${wordIndex}`);

      if (detailsDiv) {
        const isExpanded = detailsDiv.style.display === 'block';
        detailsDiv.style.display = isExpanded ? 'none' : 'block';

        const toggleBtn = e.target.closest('.toggle-details');
        toggleBtn.setAttribute('aria-expanded', !isExpanded);
      }
    }

    // Handle delete word
    if (e.target.classList.contains('delete-word')) {
      const wordIndex = parseInt(e.target.getAttribute('data-word-index'));
      const wordObj = AppState.wordCatalogue[wordIndex];

      if (wordObj && confirm(`Delete word "${wordObj.word}"?`)) {
        AppState.wordCatalogue.splice(wordIndex, 1);
        
        if (window.saveUserCatalogueToSupabase) {
          window.saveUserCatalogueToSupabase();
        }
        
        ProgressManager.updateStatsList();
        ProgressManager.updateStatsSummary();
        SmartListManager.refreshSmartList();
      }
    }
  }

  /**
   * Handle random stats toggle
   */
  static handleRandomStatsToggle() {
    const randomStatsDiv = document.getElementById('random-stats');
    const toggleBtn = document.getElementById('toggle-random-stats-btn');

    if (!randomStatsDiv || !toggleBtn) return;

    if (randomStatsDiv.style.display === 'block') {
      randomStatsDiv.style.display = 'none';
      toggleBtn.textContent = 'Show Random Trials';
    } else {
      ProgressManager.updateRandomStatsList();
      randomStatsDiv.style.display = 'block';
      toggleBtn.textContent = 'Hide Random Trials';
    }
  }

  /**
   * Setup help handlers
   */
  static setupHelpHandlers() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('help-btn-card') && e.target.dataset.help) {
        this.showHelpModal(e.target.dataset.help);
      }
    });

    // Help modal close handlers
    const helpClose = document.getElementById('help-close');
    if (helpClose) {
      helpClose.addEventListener('click', this.hideHelpModal);
    }

    window.addEventListener('click', (event) => {
      const modal = document.getElementById('help-modal');
      if (event.target === modal) {
        this.hideHelpModal();
      }
    });
  }

  /**
   * Show help modal with appropriate content
   */
  static showHelpModal(helpType) {
    const helpTexts = {
      auth: "Enter your email and password to sign in or sign up. Toggle between sign in and sign up modes using the link below the form.",
      home: "Home: Use buttons to add words, Practice, view stats, and see the Word of the Day. Click the Word of the Day for its definition and to add it to your catalogue.",
      username: "Choose a unique username to complete your account setup. Your username must be at least 3 characters long and can only contain letters, numbers, and underscores.",
      "add-word": "Add Word: Enter a new word to add to your catalogue and press 'Add Word'. The word will be saved to your personal vocabulary list.",
      practice: "Practice: Select your Practice source from the dropdown (Catalogue, Random Words, or Custom Lists). Click the covered word to reveal it, then type your spelling. Use the Talk button to hear the word spoken aloud.",
      lists: "Custom Lists: Create and manage your custom word lists. Click 'Create New List' to make a new list, or click on existing lists to view and edit them.",
      "list-detail": "List Detail: View and manage words in your custom list. Click the title or description to edit them. Add new words using the input field, or remove words using the minus button.",
      stats: "Statistics: View your learning progress and word performance. Export your data, import from backup, or create custom lists. Click on words to see detailed statistics and manage them."
    };

    const helpText = helpTexts[helpType] || "Welcome to Lexcelerate - your personal spelling practice app.";
    
    const helpTextElement = document.getElementById('help-text');
    const helpModal = document.getElementById('help-modal');
    
    if (helpTextElement) {
      helpTextElement.innerHTML = `<p>${helpText}</p>`;
    }
    if (helpModal) {
      helpModal.style.display = 'block';
    }
  }

  /**
   * Hide help modal
   */
  static hideHelpModal() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
      helpModal.style.display = 'none';
    }
  }

  /**
   * Setup import/export handlers
   */
  static setupImportExportHandlers() {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', this.handleExport);
    }

    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', this.handleImport);
    }
  }

  /**
   * Handle catalogue export
   */
  static handleExport() {
    const exportData = JSON.stringify(AppState.wordCatalogue, null, 2);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(exportData).then(() => {
        NotificationManager.show("Catalogue exported to clipboard");
      }).catch(() => {
        prompt("Copy the following JSON:", exportData);
      });
    } else {
      prompt("Copy the following JSON:", exportData);
    }
  }

  /**
   * Handle catalogue import
   */
  static handleImport() {
    const importData = prompt("Paste your catalogue JSON here:");
    if (!importData) return;

    try {
      const imported = JSON.parse(importData);
      if (Array.isArray(imported)) {
        AppState.wordCatalogue.length = 0; // Clear existing
        AppState.wordCatalogue.push(...imported); // Add imported
        
        if (window.saveUserCatalogueToSupabase) {
          window.saveUserCatalogueToSupabase();
        }
        
        NotificationManager.show("Catalogue imported successfully");
        ProgressManager.updateStatsList();
      } else {
        alert("Invalid data format.");
      }
    } catch (e) {
      alert("Error parsing JSON.");
    }
  }
}

// ---------------------------
// Global API Functions (for backward compatibility)
// ---------------------------

// Make functions globally accessible
window.showScreen = ScreenManager.showScreen.bind(ScreenManager);
window.loadWordOfTheDay = () => wordOfTheDayManager.load();
window.showNotification = NotificationManager.show.bind(NotificationManager);
window.getSmartList = SmartListManager.getSmartList.bind(SmartListManager);
window.refreshSmartList = SmartListManager.refreshSmartList.bind(SmartListManager);

// ---------------------------
// Application Initialization
// ---------------------------

/**
 * Initialize the application
 */
function initializeApplication() {
  // Initialize audio system
  audioManager.initialize();
  
  // Initialize event handlers
  EventHandlers.initialize();
  
  // Load word of the day
  wordOfTheDayManager.load();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApplication);