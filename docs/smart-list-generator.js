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
    // Ensure DOM is ready before initializing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.createListSelector();
        this.attachEventListeners();
        this.loadAvailableLists();
      });
    } else {
      this.createListSelector();
      // Use longer timeout to ensure DOM is fully rendered
      setTimeout(() => {
        this.attachEventListeners();
        this.loadAvailableLists();
      }, 200);
    }
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
    // Wait for DOM to be ready and attach event listeners
    const attachListeners = () => {
      const currentListBtn = document.getElementById('current-list-button');
      const dropdown = document.getElementById('practice-source-menu');
      
      if (currentListBtn && dropdown) {
        // Remove any existing listeners to prevent duplicates
        currentListBtn.replaceWith(currentListBtn.cloneNode(true));
        const newBtn = document.getElementById('current-list-button');
        
        newBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Dropdown button clicked'); // Debug log
          this.toggleDropdown();
        });
        
        console.log('Event listeners attached successfully'); // Debug log
      } else {
        console.warn('Button or dropdown not found, retrying...'); // Debug log
        setTimeout(attachListeners, 100); // Retry after 100ms
      }
    };
    
    // Try to attach listeners immediately, then retry if needed
    attachListeners();

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
    console.log('toggleDropdown called'); // Debug log
    const dropdown = document.getElementById('practice-source-menu');
    const button = document.getElementById('current-list-button');
    
    if (dropdown && button) {
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      button.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
      
      console.log('Dropdown toggled:', isVisible ? 'closed' : 'opened'); // Debug log
      
      if (!isVisible) {
        this.loadAvailableLists();
      }
    } else {
      console.error('Dropdown or button element not found'); // Debug log
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
    const dropdown = document.getElementById('practice-source-menu');
    if (!dropdown) {
      console.warn('practice-source-menu not found');
      return;
    }
    
    const userListsDropdown = document.getElementById('user-lists-dropdown');
    if (!userListsDropdown) {
      console.warn('user-lists-dropdown not found');
      return;
    }
    
    if (this.availableLists.length === 0) {
      userListsDropdown.innerHTML = '<div class="dropdown-empty">No custom lists yet</div>';
      return;
    }
    
    userListsDropdown.innerHTML = this.availableLists.map(list => `
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
    console.log('Updating practice mode to:', listId); // Debug log
    
    const addRandomBtn = document.getElementById('add-random-to-catalogue-btn');
    
    if (listId === 'catalogue') {
      window.practiceMode = 'catalogue';
      if (addRandomBtn) {
        addRandomBtn.style.display = 'none';
      }
    } else if (listId === 'random') {
      window.practiceMode = 'random';
      if (addRandomBtn) {
        addRandomBtn.style.display = 'inline-block';
      }
    } else {
      // Custom list mode - implement list-specific practice
      window.practiceMode = 'custom-list';
      window.currentPracticeListId = listId;
      if (addRandomBtn) {
        addRandomBtn.style.display = 'none';
      }
    }
    
    console.log('Practice mode set to:', window.practiceMode); // Debug log
    
    // Reload Practice 
    if (window.loadPracticeWord) {
      console.log('Loading new practice word...'); // Debug log
      window.loadPracticeWord();
    } else {
      console.error('loadPracticeWord function not found'); // Debug log
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