import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import UserProfile from './components/UserProfile';
import './App.css';

// Word of the Day words list
const defaultWords = [
  "serendipity", "eloquence", "ephemeral", "labyrinth", "mellifluous",
  "quintessential", "ubiquitous", "perspicacious", "magnanimous", "effervescent"
];

function App() {
  const { user, loading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wordCatalogue, setWordCatalogue] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [wordOfTheDay, setWordOfTheDay] = useState('');

  // Load user-specific data when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
      loadWordOfTheDay();
    } else {
      // Clear data when user logs out
      setWordCatalogue([]);
      setCurrentScreen('home');
    }
  }, [user]);

  // Load sound preference
  useEffect(() => {
    const savedSound = localStorage.getItem('soundEnabled');
    setSoundEnabled(savedSound !== null ? JSON.parse(savedSound) : true);
  }, []);

  const loadUserData = () => {
    if (!user) return;
    
    const userKey = `wordCatalogue_${user.uid}`;
    const saved = localStorage.getItem(userKey);
    const catalogue = saved ? JSON.parse(saved) : [];
    
    // Ensure each word has required fields
    catalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.definition) wordObj.definition = '';
      if (!wordObj.dateAdded) wordObj.dateAdded = new Date().toISOString();
      if (!wordObj.mistakes) wordObj.mistakes = {};
      if (!wordObj.totalAttempts) wordObj.totalAttempts = 0;
      if (!wordObj.correctFirstTryCount) wordObj.correctFirstTryCount = 0;
    });
    
    setWordCatalogue(catalogue);
    saveUserData(catalogue);
  };

  const saveUserData = (catalogue = wordCatalogue) => {
    if (!user) return;
    
    const userKey = `wordCatalogue_${user.uid}`;
    localStorage.setItem(userKey, JSON.stringify(catalogue));
  };

  const loadWordOfTheDay = () => {
    const storedWOTD = localStorage.getItem('wotd');
    const wotdTimestamp = localStorage.getItem('wotdTimestamp');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (storedWOTD && wotdTimestamp && (now - parseInt(wotdTimestamp) < oneDay)) {
      setWordOfTheDay(storedWOTD);
    } else {
      const randomWord = defaultWords[Math.floor(Math.random() * defaultWords.length)];
      localStorage.setItem('wotd', randomWord);
      localStorage.setItem('wotdTimestamp', now.toString());
      setWordOfTheDay(randomWord);
    }
  };

  const toggleSound = () => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    localStorage.setItem('soundEnabled', JSON.stringify(newSoundState));
  };

  const handleWordOfTheDayClick = async () => {
    if (!wordOfTheDay) return;
    
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordOfTheDay}`);
      const data = await response.json();
      
      let definition = "Definition not found.";
      if (Array.isArray(data) && data[0].meanings && data[0].meanings.length > 0) {
        definition = data[0].meanings[0].definitions[0].definition;
      }
      
      const shouldAdd = window.confirm(
        `Word: ${wordOfTheDay}\n\nDefinition: ${definition}\n\nWould you like to add this word to your catalogue?`
      );
      
      if (shouldAdd) {
        addWordToCatalogue(wordOfTheDay, definition);
      }
    } catch (error) {
      console.error('Error fetching definition:', error);
    }
  };

  const addWordToCatalogue = (word, definition = '') => {
    const existingWord = wordCatalogue.find(w => w.word.toLowerCase() === word.toLowerCase());
    
    if (!existingWord) {
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
      
      const updatedCatalogue = [...wordCatalogue, newWord];
      setWordCatalogue(updatedCatalogue);
      saveUserData(updatedCatalogue);
      
      return true;
    }
    
    return false;
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Lexcelerate...</p>
        </div>
      </div>
    );
  }

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="app">
        <header>
          <button className="help-btn" title="Help">❓</button>
        </header>
        
        <main className="container">
          <AuthForm 
            isLogin={isLoginMode}
            onToggleMode={() => setIsLoginMode(!isLoginMode)}
            onAuthSuccess={() => {
              // Auth success is handled by the useAuth hook
              console.log('Authentication successful');
            }}
          />
        </main>
      </div>
    );
  }

  // Main app interface for authenticated users
  return (
    <div className="app">
      <header>
        <button 
          onClick={toggleSound}
          className="sound-toggle-header" 
          title="Toggle Sound"
        >
          <span>{soundEnabled ? '🔊' : '🔇'}</span>
        </button>
        <button className="help-btn" title="Help">❓</button>
      </header>

      <main className="container">
        <div className="home-screen">
          <h1 className="app-title">Lexcelerate</h1>
          
          {/* User Profile Section */}
          <UserProfile 
            user={user} 
            onLogout={() => {
              setCurrentScreen('home');
              setWordCatalogue([]);
            }}
          />
          
          {/* Word of the Day Section */}
          <div className="word-of-day-section">
            <h2>Word of the Day</h2>
            <div 
              className="word-of-day-card" 
              onClick={handleWordOfTheDayClick}
              tabIndex="0" 
              role="button" 
              aria-label="Click to see definition"
            >
              <span className="wotd-word">{wordOfTheDay || 'Loading...'}</span>
            </div>
            <p className="wotd-hint">Click the word to see its definition!</p>
          </div>

          {/* Navigation Buttons */}
          <div className="nav-buttons">
            <button 
              className="nav-btn"
              onClick={() => window.location.href = 'add-word.html'}
            >
              Add Word
            </button>
            <button 
              className="nav-btn"
              onClick={() => window.location.href = 'practice.html'}
            >
              Practice Word
            </button>
            <button 
              className="nav-btn"
              onClick={() => window.location.href = 'stats.html'}
            >
              Stats
            </button>
          </div>

          {/* Progress Summary */}
          <div className="progress-summary">
            <p>Words in catalogue: <span className="word-count">{wordCatalogue.length}</span></p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-icon active" title="Home">🏠</button>
        <button className="nav-icon" title="Add Word">➕</button>
        <button className="nav-icon" title="Stats">📊</button>
      </nav>
    </div>
  );
}

export default App;