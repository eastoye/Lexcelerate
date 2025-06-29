import React, { useState } from 'react';
import AddWord from './components/AddWord';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const handleNavigateToAddWord = () => {
    setCurrentPage('addWord');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  const handleWordAdded = (newWord) => {
    console.log('New word added:', newWord);
    // You can add additional logic here, such as updating a global state
    // or triggering a refresh of the word catalogue
  };

  if (currentPage === 'addWord') {
    return (
      <AddWord 
        onBack={handleBackToHome}
        onWordAdded={handleWordAdded}
      />
    );
  }

  // Home page content (you can replace this with your existing home component)
  return (
    <div className="app">
      <div className="home-container">
        <h1>Lexcelerate</h1>
        <p>Welcome to your vocabulary learning app!</p>
        <button 
          className="nav-button"
          onClick={handleNavigateToAddWord}
        >
          Add Word
        </button>
      </div>
    </div>
  );
}

export default App;