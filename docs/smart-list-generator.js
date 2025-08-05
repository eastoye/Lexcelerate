// Smart List Generator Module
import { createUserList, addWordToList } from './user-lists-api.js';

// Pre-made list categories with their word sets
const PREMADE_LISTS = {
  'common-misspellings': {
    name: 'Common Misspellings',
    description: 'Frequently misspelled words in English',
    words: ['accommodate', 'definitely', 'separate', 'occurrence', 'embarrass', 'privilege', 'necessary', 'receive', 'beginning', 'calendar']
  },
  'academic-vocabulary': {
    name: 'Academic Vocabulary',
    description: 'Essential words for academic writing',
    words: ['analyze', 'synthesize', 'hypothesis', 'methodology', 'bibliography', 'phenomenon', 'criterion', 'paradigm', 'empirical', 'theoretical']
  },
  'business-terms': {
    name: 'Business Terms',
    description: 'Professional vocabulary for workplace communication',
    words: ['entrepreneur', 'acquisition', 'negotiation', 'strategy', 'implementation', 'collaboration', 'efficiency', 'innovation', 'competitive', 'sustainable']
  },
  'science-vocabulary': {
    name: 'Science Vocabulary',
    description: 'Scientific terms and concepts',
    words: ['photosynthesis', 'chromosome', 'ecosystem', 'molecule', 'hypothesis', 'experiment', 'variable', 'observation', 'conclusion', 'analysis']
  },
  'advanced-spelling': {
    name: 'Advanced Spelling',
    description: 'Challenging words for advanced learners',
    words: ['onomatopoeia', 'pneumonia', 'rhythm', 'psychology', 'bureaucracy', 'pharmaceutical', 'conscientious', 'maintenance', 'pronunciation', 'questionnaire']
  }
};

// Smart List Generator Class
class SmartListGenerator {
  constructor() {
    this.currentStep = 1;
    this.selectedType = null;
    this.selectedCategory = null;
    this.wordCount = 10;
    this.listName = '';
    this.generatedWords = [];
  }

  // Initialize the generator UI
  init() {
    this.createGeneratorModal();
    this.attachEventListeners();
  }

  // Create the modal structure
  createGeneratorModal() {
    const modalHTML = `
      <div id="smart-list-generator-modal" class="modal smart-generator-modal" style="display: none;">
        <div class="modal-content smart-generator-content">
          <div class="generator-header">
            <h2>Smart List Generator</h2>
            <span class="close smart-generator-close">&times;</span>
          </div>
          
          <!-- Progress Indicator -->
          <div class="progress-indicator">
            <div class="step active" data-step="1">
              <div class="step-number">1</div>
              <div class="step-label">Choose Type</div>
            </div>
            <div class="step" data-step="2">
              <div class="step-number">2</div>
              <div class="step-label">Configure</div>
            </div>
            <div class="step" data-step="3">
              <div class="step-number">3</div>
              <div class="step-label">Review</div>
            </div>
          </div>

          <!-- Step 1: Choose List Type -->
          <div id="generator-step-1" class="generator-step active">
            <h3>Choose Your List Type</h3>
            <div class="list-type-options">
              <div class="list-type-card" data-type="premade">
                <div class="type-icon">📚</div>
                <h4>Pre-made Lists</h4>
                <p>Curated word collections for specific topics</p>
              </div>
              <div class="list-type-card" data-type="low-scores">
                <div class="type-icon">📉</div>
                <h4>Lowest Scores</h4>
                <p>Words you need the most practice with</p>
              </div>
              <div class="list-type-card" data-type="frequent-mistakes">
                <div class="type-icon">❌</div>
                <h4>Frequent Mistakes</h4>
                <p>Words you misspell most often</p>
              </div>
            </div>
          </div>

          <!-- Step 2: Configure List -->
          <div id="generator-step-2" class="generator-step">
            <h3 id="step2-title">Configure Your List</h3>
            
            <!-- Pre-made Categories -->
            <div id="premade-categories" class="config-section" style="display: none;">
              <label>Select Category:</label>
              <div class="category-grid">
                <!-- Categories will be populated dynamically -->
              </div>
            </div>

            <!-- Word Count Selection -->
            <div class="config-section">
              <label for="word-count-slider">Number of Words: <span id="word-count-display">10</span></label>
              <input type="range" id="word-count-slider" min="5" max="50" value="10" class="word-count-slider">
              <div class="slider-labels">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            <!-- List Name -->
            <div class="config-section">
              <label for="generated-list-name">List Name:</label>
              <input type="text" id="generated-list-name" placeholder="Enter list name" class="list-name-input">
            </div>
          </div>

          <!-- Step 3: Review and Create -->
          <div id="generator-step-3" class="generator-step">
            <h3>Review Your List</h3>
            <div class="list-preview">
              <div class="preview-header">
                <h4 id="preview-list-name">My Custom List</h4>
                <span id="preview-word-count">10 words</span>
              </div>
              <div id="preview-words" class="preview-words">
                <!-- Words will be populated here -->
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="generator-navigation">
            <button id="generator-back" class="btn-secondary" style="display: none;">Back</button>
            <button id="generator-next" class="btn-primary">Next</button>
            <button id="generator-create" class="btn-success" style="display: none;">Create List</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.populatePremadeCategories();
  }

  // Populate pre-made categories
  populatePremadeCategories() {
    const categoryGrid = document.querySelector('.category-grid');
    Object.entries(PREMADE_LISTS).forEach(([key, category]) => {
      const categoryCard = document.createElement('div');
      categoryCard.className = 'category-card';
      categoryCard.dataset.category = key;
      categoryCard.innerHTML = `
        <h5>${category.name}</h5>
        <p>${category.description}</p>
        <span class="word-count">${category.words.length} words</span>
      `;
      categoryGrid.appendChild(categoryCard);
    });
  }

  // Attach event listeners
  attachEventListeners() {
    // Modal controls
    document.querySelector('.smart-generator-close').addEventListener('click', () => this.closeModal());
    
    // List type selection
    document.querySelectorAll('.list-type-card').forEach(card => {
      card.addEventListener('click', (e) => this.selectListType(e.target.closest('.list-type-card').dataset.type));
    });

    // Category selection
    document.addEventListener('click', (e) => {
      if (e.target.closest('.category-card')) {
        this.selectCategory(e.target.closest('.category-card').dataset.category);
      }
    });

    // Word count slider
    document.getElementById('word-count-slider').addEventListener('input', (e) => {
      this.wordCount = parseInt(e.target.value);
      document.getElementById('word-count-display').textContent = this.wordCount;
    });

    // List name input
    document.getElementById('generated-list-name').addEventListener('input', (e) => {
      this.listName = e.target.value;
    });

    // Navigation
    document.getElementById('generator-next').addEventListener('click', () => this.nextStep());
    document.getElementById('generator-back').addEventListener('click', () => this.previousStep());
    document.getElementById('generator-create').addEventListener('click', () => this.createList());
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
    this.currentStep = 1;
    this.selectedType = null;
    this.selectedCategory = null;
    this.wordCount = 10;
    this.listName = '';
    this.generatedWords = [];
    this.updateUI();
  }

  // Select list type
  selectListType(type) {
    this.selectedType = type;
    document.querySelectorAll('.list-type-card').forEach(card => card.classList.remove('selected'));
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    document.getElementById('generator-next').disabled = false;
  }

  // Select category (for pre-made lists)
  selectCategory(category) {
    this.selectedCategory = category;
    document.querySelectorAll('.category-card').forEach(card => card.classList.remove('selected'));
    document.querySelector(`[data-category="${category}"]`).classList.add('selected');
    
    // Auto-populate list name
    if (!this.listName) {
      document.getElementById('generated-list-name').value = PREMADE_LISTS[category].name;
      this.listName = PREMADE_LISTS[category].name;
    }
  }

  // Navigate to next step
  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
      if (this.currentStep === 3) {
        this.generatePreview();
      }
      this.updateUI();
    }
  }

  // Navigate to previous step
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
    }
  }

  // Update UI based on current step
  updateUI() {
    // Update progress indicator
    document.querySelectorAll('.step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 <= this.currentStep);
      step.classList.toggle('completed', index + 1 < this.currentStep);
    });

    // Show/hide steps
    document.querySelectorAll('.generator-step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update step 2 content based on selected type
    if (this.currentStep === 2) {
      document.getElementById('premade-categories').style.display = 
        this.selectedType === 'premade' ? 'block' : 'none';
      
      const titles = {
        'premade': 'Choose a Category',
        'low-scores': 'Configure Low Score List',
        'frequent-mistakes': 'Configure Mistake List'
      };
      document.getElementById('step2-title').textContent = titles[this.selectedType] || 'Configure Your List';
    }

    // Update navigation buttons
    document.getElementById('generator-back').style.display = this.currentStep > 1 ? 'inline-block' : 'none';
    document.getElementById('generator-next').style.display = this.currentStep < 3 ? 'inline-block' : 'none';
    document.getElementById('generator-create').style.display = this.currentStep === 3 ? 'inline-block' : 'none';
  }

  // Generate words based on selected type
  generateWords() {
    switch (this.selectedType) {
      case 'premade':
        return PREMADE_LISTS[this.selectedCategory].words.slice(0, this.wordCount);
      
      case 'low-scores':
        return window.getSmartList(this.wordCount, 'low_score').map(w => w.word);
      
      case 'frequent-mistakes':
        return window.getSmartList(this.wordCount, 'error_history').map(w => w.word);
      
      default:
        return [];
    }
  }

  // Generate preview for step 3
  generatePreview() {
    this.generatedWords = this.generateWords();
    
    // Update preview header
    document.getElementById('preview-list-name').textContent = this.listName || 'Untitled List';
    document.getElementById('preview-word-count').textContent = `${this.generatedWords.length} words`;
    
    // Update preview words
    const previewContainer = document.getElementById('preview-words');
    previewContainer.innerHTML = this.generatedWords.map((word, index) => 
      `<div class="preview-word">
        <span class="word-number">${index + 1}.</span>
        <span class="word-text">${word}</span>
      </div>`
    ).join('');
  }

  // Create the list
  async createList() {
    if (!this.listName.trim()) {
      alert('Please enter a list name.');
      return;
    }

    if (this.generatedWords.length === 0) {
      alert('No words to add to the list.');
      return;
    }

    try {
      // Create the list
      const listResult = await createUserList(this.listName);
      if (!listResult.success) {
        throw new Error(listResult.error);
      }

      // Add words to the list
      const listId = listResult.data.id;
      for (const word of this.generatedWords) {
        const wordResult = await addWordToList(listId, word);
        if (!wordResult.success && !wordResult.error.includes('already exists')) {
          console.warn(`Failed to add word "${word}":`, wordResult.error);
        }
      }

      // Show success and close modal
      showNotification(`List "${this.listName}" created with ${this.generatedWords.length} words!`);
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
    this.attachEventListeners();
    this.loadAvailableLists();
  }

  // Create the list selector UI
  createListSelector() {
    const practiceScreen = document.getElementById('practice-screen');
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    
    // Replace mode toggle with list selector
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
          <div class="dropdown-section-header">My Lists</div>
          <div id="user-lists-dropdown">
            <!-- User lists will be populated here -->
          </div>
        </div>
      </div>
    `;

    modeToggleBtn.outerHTML = listSelectorHTML;
  }

  // Attach event listeners
  attachEventListeners() {
    // Toggle dropdown
    document.getElementById('current-list-btn').addEventListener('click', () => {
      this.toggleDropdown();
    });

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
  }

  // Toggle dropdown visibility
  toggleDropdown() {
    const dropdown = document.getElementById('list-dropdown');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      this.loadAvailableLists();
    }
  }

  // Close dropdown
  closeDropdown() {
    document.getElementById('list-dropdown').style.display = 'none';
  }

  // Load available user lists
  async loadAvailableLists() {
    try {
      if (window.getUserLists) {
        const result = await window.getUserLists();
        if (result.success) {
          this.availableLists = result.data;
          this.updateDropdownLists();
        }
      }
    } catch (error) {
      console.error('Error loading user lists:', error);
    }
  }

  // Update dropdown with user lists
  updateDropdownLists() {
    const container = document.getElementById('user-lists-dropdown');
    
    if (this.availableLists.length === 0) {
      container.innerHTML = '<div class="dropdown-empty">No custom lists yet</div>';
      return;
    }

    container.innerHTML = this.availableLists.map(list => `
      <div class="dropdown-item" data-list-id="${list.id}">
        <span class="list-icon">📋</span>
        <span>${list.name}</span>
      </div>
    `).join('');
  }

  // Select a list for practice
  selectList(listId, listName) {
    this.currentListId = listId;
    this.currentListName = listName;
    
    // Update UI
    document.getElementById('current-list-name').textContent = listName;
    
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
    
    // Reload practice word
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

// Make functions globally available
window.initializeSmartListGenerator = initializeSmartListGenerator;