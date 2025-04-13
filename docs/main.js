// main.js
import * as Auth from "./auth.js";
import * as Catalogue from "./catalogue.js";
import * as Practice from "./practice.js";
import * as Stats from "./stats.js";

// Wrap all code in DOMContentLoaded:
document.addEventListener("DOMContentLoaded", () => {

  // Global state variables
  let currentUser = Auth.checkLogin();
  let wordCatalogue = [];
  let randomTrials = [];
  let practiceMode = 'catalogue';
  let currentRevealCount = 0;
  let wotdHandling = false;
  let attemptCount = 0;
  let currentWordObj = null;
  let soundEnabled = true;

  // On initial load, if the user is logged in, load the catalogue:
  if (currentUser) {
    wordCatalogue = Catalogue.loadUserCatalogue(currentUser);
  }

  // Attach event listeners for Auth buttons
  document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const user = Auth.loginUser(username, password);
    if (user) {
      currentUser = user;
      wordCatalogue = Catalogue.loadUserCatalogue(currentUser);
      showScreen('home-screen');
      loadWordOfTheDay();
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logoutUser();
    currentUser = null;
    wordCatalogue = [];
    showScreen('login-screen');
  });

  // Define showScreen and loadWordOfTheDay locally or import if you want to split further
  function showScreen(screenId) {
    document.querySelectorAll('.screen, #home-screen, #login-screen').forEach(screen => {
      screen.style.display = 'none';
    });
    document.getElementById(screenId).style.display = 'block';
    if (screenId === 'home-screen') updateProgressSummary();
    if (screenId === 'stats-screen') Stats.updateStatsList(wordCatalogue);
  }

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

  // For brevity, you would then add additional event listeners (practice mode toggles,
  // export/import, reveal actions, etc.) similar to your original code and using functions
  // from the imported modules (Practice and Stats).

  // Finally, call:
  showScreen(currentUser ? 'home-screen' : 'login-screen');
});
