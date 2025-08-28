// Smart List Generator Module
import { createUserList, addWordToList } from './user-lists-api.js';

// Smart List Generator Class
class SmartListGenerator {
  constructor() {
    this.wordCount = 10;
    this.listName = '';
  }

  // Initialize the generator UI
  init() {
    this.createGeneratorModal();
    this.attachEventListeners();
  }

  // Create the modal structure
  createGeneratorModal() {
    const modalHTML = `
      <div id="smart-list-generator-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <h3>Smart List Generator</h3>
          <span class="close smart-generator-close">&times;</span>
          <p>Create a list of your lowest scoring words for focused practice.</p>
          
          <form id="smart-list-form">
            <label for="smart-list-name">List Name:</label>
            <input type="text" id="smart-list-name" placeholder="Enter list name" required>
            
            <label for="smart-list-description">Description (optional):</label>
            <input type="text" id="smart-list-description" placeholder="Enter description">
            
            <label for="smart-word-count">Number of Words: <span id="smart-word-count-display">10</span></label>
            <input type="range" id="smart-word-count" min="5" max="50" value="10">
            <div class="slider-labels">
              <span>5</span>
              <span>50</span>
            </div>
            
            <div class="modal-actions">
              <button type="submit">Create Smart List</button>
              <button type="button" id="cancel-smart-list">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Attach event listeners
  attachEventListeners() {
    // Modal controls
    document.querySelector('.smart-generator-close').addEventListener('click', () => this.closeModal());
    
    // Cancel button
    document.getElementById('cancel-smart-list').addEventListener('click', () => this.closeModal());

    // Word count slider
    document.getElementById('smart-word-count').addEventListener('input', (e) => {
      this.wordCount = parseInt(e.target.value);
      document.getElementById('smart-word-count-display').textContent = this.wordCount;
    });

    // Form submission
    document.getElementById('smart-list-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createSmartList();
    });
  }

  // Show the generator modal
  show() {
    document.getElementById('smart-list-generator-modal').style.display = 'block';
    this.reset();
  }

  // Close the modal
  closeModal() {
    document.getElementById('smart-list-generator-modal').style.display = 'none';
    this.reset();
  }

  // Reset generator state
  reset() {
    this.wordCount = 10;
    this.listName = '';
    document.getElementById('smart-list-name').value = '';
    document.getElementById('smart-list-description').value = '';
    document.getElementById('smart-word-count').value = 10;
    document.getElementById('smart-word-count-display').textContent = '10';
  }

  // Create smart list with lowest scoring words
  async createSmartList() {
    const listName = document.getElementById('smart-list-name').value.trim();
    const description = document.getElementById('smart-list-description').value.trim();
    const wordCount = parseInt(document.getElementById('smart-word-count').value);
    
    if (!listName) {
      alert('Please enter a list name.');
      return;
    }

    // Get lowest scoring words
    const lowestScoreWords = window.getSmartList(wordCount, 'low_score').map(w => w.word);
    
    if (lowestScoreWords.length === 0) {
      alert('No words to add to the list.');
      return;
    }

    try {
      // Create the list
      const listResult = await createUserList(listName);
      if (!listResult.success) {
        throw new Error(listResult.error);
      }

      // Add words to the list
      const listId = listResult.data.id;
      for (const word of lowestScoreWords) {
        const wordResult = await addWordToList(listId, word);
        if (!wordResult.success && !wordResult.error.includes('already exists')) {
          console.warn(`Failed to add word "${word}":`, wordResult.error);
        }
      }

      // Show success and close modal
      showNotification(`Smart list "${listName}" created with ${lowestScoreWords.length} words!`);
      this.closeModal();
      
      // Refresh lists if on lists screen
      if (document.getElementById('my-lists-screen').style.display !== 'none') {
        window.loadUserLists?.();
      }

    } catch (error) {
      alert(`Error creating list: ${error.message}`);
    }
  }
}

// Practice Mode List Selector
class PracticeListSelector {
  constructor() {
    this.currentListId = null;
    this.currentListName = 'Catalogue';
    this.availableLists = [];
  }

  // Initialize the practice list selector
  init() {
    this.createListSelector();
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      this.attachEventListeners();
      this.loadAvailableLists();
    }, 100);
  }

  // Create the list selector UI
  createListSelector() {
    const practiceScreen = document.getElementById('practice-screen');
    const modeSection = document.querySelector('#practice-screen .mode-section');
    
    // Safety check - if mode section doesn't exist, skip initialization
    if (!modeSection) {
      console.warn('mode-section element not found, skipping list selector initialization');
      return;
    }
    
    // Replace the entire mode section content with list selector
    const listSelectorHTML = `
      <div class="practice-list-selector">
        <button id="current-list-btn" class="current-list-button">
          <span class="list-icon">📝</span>
          <span id="current-list-name">Catalogue</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div id="list-dropdown" class="list-dropdown" style="display: none;">
          <div class="dropdown-header">Select Practice Source</div>
          <div class="dropdown-item active" data-list-id="catalogue">
            <span class="list-icon">📚</span>
            <span>Catalogue</span>
          </div>
          <div class="dropdown-item" data-list-id="random">
            <span class="list-icon">🎲</span>
            <span>Random Words</span>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-section-header clickable-header" id="my-lists-header">
            <span>My Lists</span>
            <span class="expand-arrow">▶</span>
          </div>
          <div id="user-lists-dropdown" class="collapsible-section" style="display: none;">
            <!-- User lists will be populated here -->
          </div>
        </div>
      </div>
      
      <!-- Add Random Word Button (only visible in Random mode) -->
      <button id="add-random-to-catalogue-btn" class="add-random-btn" style="display: none;">
        <span class="btn-icon">➕</span>
        <span class="btn-text">Add to Catalogue</span>
      </button>
    `;

    modeSection.innerHTML = listSelectorHTML;
  }

  // Attach event listeners
  attachEventListeners() {
    // Toggle dropdown - use the correct ID from HTML
    const currentListBtn = document.getElementById('current-list-button');
    if (currentListBtn) {
      currentListBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.practice-list-selector')) {
        this.closeDropdown();
      }
    });

    // Handle list selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('.dropdown-item')) {
        const listId = e.target.closest('.dropdown-item').dataset.listId;
        const listName = e.target.closest('.dropdown-item').textContent.trim();
        this.selectList(listId, listName);
      }
    });

    // Handle My Lists header click to expand/collapse
    document.addEventListener('click', (e) => {
      if (e.target.closest('#my-lists-header')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMyListsSection();
      }
    });
  }

  // Toggle My Lists section visibility
  toggleMyListsSection() {
    const dropdown = document.getElementById('user-lists-dropdown');
    const arrow = document.querySelector('#my-lists-header .expand-arrow');
    
    if (dropdown.style.display === 'none') {
      dropdown.style.display = 'block';
      arrow.textContent = '▼';
      // Load lists when expanding
      this.loadAvailableLists();
    } else {
      dropdown.style.display = 'none';
      arrow.textContent = '▶';
    }
  }

  // Toggle dropdown visibility
  toggleDropdown() {
    const dropdown = document.getElementById('practice-source-menu');
    if (dropdown) {
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        this.loadAvailableLists();
      }
    }
  }

  // Close dropdown
  closeDropdown() {
    const dropdown = document.getElementById('practice-source-menu');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }

  // Load available user lists
  async loadAvailableLists() {
    try {
      // Import the getUserLists function
      const { getUserLists } = await import('./user-lists-api.js');
      const result = await getUserLists();
      if (result.success) {
        this.availableLists = result.data;
        this.updateDropdownLists();
      } else {
        console.error('Error loading user lists:', result.error);
        this.availableLists = [];
        this.updateDropdownLists();
      }
    } catch (error) {
      console.error('Error loading user lists:', error);
      this.availableLists = [];
      this.updateDropdownLists();
    }
  }

  // Update dropdown with user lists
  updateDropdownLists() {
    const container = document.getElementById('practice-source-menu').querySelector('[data-action="open-lists"]')?.parentElement;
    
    if (!container) {
      console.warn('dropdown container not found');
      return;
    }
    
    if (this.availableLists.length === 0) {
      container.innerHTML = '<div class="dropdown-empty">No custom lists yet</div>';
      return;
    }

    container.innerHTML = this.availableLists.map(list => `
      <div class="dropdown-item" data-list-id="${list.id}">
        <span class="list-icon">📋</span>
        <span>${this.escapeHtml(list.name)}</span>
      </div>
    `).join('');
  }

  // Utility function to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Select a list for practice
  selectList(listId, listName) {
    this.currentListId = listId;
    this.currentListName = listName;
    
    // Update UI
    const currentListNameEl = document.getElementById('current-list-button').querySelector('span:first-child');
    if (currentListNameEl) {
      currentListNameEl.textContent = listName;
    }
    
    // Update active state
    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.classList.toggle('active', item.dataset.listId === listId);
    });
    
    this.closeDropdown();
    
    // Update practice mode logic
    this.updatePracticeMode(listId);
  }

  // Update practice mode based on selected list
  updatePracticeMode(listId) {
    if (listId === 'catalogue') {
      window.practiceMode = 'catalogue';
      document.getElementById('add-random-to-catalogue-btn').style.display = 'none';
    } else if (listId === 'random') {
      window.practiceMode = 'random';
      document.getElementById('add-random-to-catalogue-btn').style.display = 'inline-block';
    } else {
      // Custom list mode - implement list-specific practice
      window.practiceMode = 'custom-list';
      window.currentPracticeListId = listId;
      document.getElementById('add-random-to-catalogue-btn').style.display = 'none';
    }
    
    // Reload Practice 
    if (window.loadPracticeWord) {
      window.loadPracticeWord();
    }
  }
}

// Initialize components
let smartListGenerator;
let practiceListSelector;

// Export initialization function
export function initializeSmartListGenerator() {
  smartListGenerator = new SmartListGenerator();
  smartListGenerator.init();
  
  practiceListSelector = new PracticeListSelector();
  practiceListSelector.init();
  
  // Add Smart List Generator button to create list modal
  const createListModal = document.getElementById('create-list-modal');
  if (createListModal) {
    const modalContent = createListModal.querySelector('.modal-content');
    
    // Check if Smart Generator button already exists to avoid duplicates
    if (!modalContent.querySelector('.smart-gen-trigger')) {
      const smartGenButton = document.createElement('button');
      smartGenButton.type = 'button';
      smartGenButton.className = 'btn-secondary smart-gen-trigger';
      smartGenButton.textContent = '✨ Smart Generator';
      smartGenButton.addEventListener('click', () => {
        createListModal.style.display = 'none';
        smartListGenerator.show();
      });
      
      modalContent.insertBefore(smartGenButton, modalContent.querySelector('form'));
    }
  }
}

// Make functions globally available
window.initializeSmartListGenerator = initializeSmartListGenerator;