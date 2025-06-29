import React, { useState } from 'react';
import './AddWord.css';

const AddWord = ({ onBack, onWordAdded }) => {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  // Get existing words from localStorage
  const getWordCatalogue = () => {
    try {
      const catalogue = localStorage.getItem('wordCatalogue');
      return catalogue ? JSON.parse(catalogue) : [];
    } catch (error) {
      console.error('Error reading word catalogue:', error);
      return [];
    }
  };

  // Save word to localStorage
  const saveToWordCatalogue = (newWord) => {
    try {
      const catalogue = getWordCatalogue();
      catalogue.push(newWord);
      localStorage.setItem('wordCatalogue', JSON.stringify(catalogue));
      return true;
    } catch (error) {
      console.error('Error saving to word catalogue:', error);
      return false;
    }
  };

  // Check if word already exists (case-insensitive)
  const checkWordExists = (wordToCheck) => {
    const catalogue = getWordCatalogue();
    return catalogue.some(item => 
      item.word.toLowerCase() === wordToCheck.toLowerCase()
    );
  };

  // Show alert message
  const showAlert = (message, type = 'error') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Show confirmation message
  const showConfirmation = (message) => {
    showAlert(message, 'success');
  };

  // Reset form
  const resetForm = () => {
    setWord('');
    setDefinition('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    const trimmedWord = word.trim();
    if (!trimmedWord) {
      showAlert('Please enter a word');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if word already exists
      const wordExists = checkWordExists(trimmedWord);
      
      if (wordExists) {
        showAlert('This word already exists in your catalogue');
        setIsSubmitting(false);
        return;
      }
      
      // Create new word object
      const newWord = {
        word: trimmedWord,
        definition: definition.trim(),
        score: 0,
        streak: 0,
        dateAdded: new Date().toISOString()
      };
      
      // Save to localStorage
      const saved = saveToWordCatalogue(newWord);
      
      if (saved) {
        showConfirmation('Word successfully added!');
        resetForm();
        
        // Notify parent component if callback provided
        if (onWordAdded) {
          onWordAdded(newWord);
        }
      } else {
        showAlert('Failed to save word. Please try again.');
      }
    } catch (error) {
      console.error('Error adding word:', error);
      showAlert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-word-container">
      {/* Alert Message */}
      {alert.show && (
        <div className={`alert ${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Header with Back Button */}
      <header className="add-word-header">
        <button 
          className="back-button" 
          onClick={onBack}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="page-title">Add Word</h1>
      </header>

      {/* Main Content */}
      <main className="add-word-main">
        <form onSubmit={handleSubmit} className="add-word-form">
          <div className="form-group">
            <label htmlFor="word-input" className="form-label">
              Word *
            </label>
            <input
              id="word-input"
              type="text"
              className="input-field"
              placeholder="Enter a new word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
              autoComplete="off"
              spellCheck="false"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="definition-input" className="form-label">
              Definition (Optional)
            </label>
            <textarea
              id="definition-input"
              className="input-field textarea-field"
              placeholder="Add a definition (optional)"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows="4"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || !word.trim()}
            >
              {isSubmitting ? 'Adding...' : 'Add Word'}
            </button>
          </div>
        </form>

        {/* Instructions */}
        <div className="instructions">
          <p>
            Add new words to your personal catalogue for practice sessions. 
            Definitions are optional but can help with learning.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AddWord;