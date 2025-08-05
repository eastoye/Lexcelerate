// User Lists UI Components
import { 
  getUserLists, 
  createUserList, 
  updateUserList, 
  deleteUserList,
  getListWords,
  addWordToList,
  removeWordFromList 
} from './user-lists-api.js';

// Global state for user lists
let currentLists = [];
let currentListId = null;
let currentListWords = [];

// Initialize user lists functionality
export function initializeUserLists() {
  // Add event listeners for user lists navigation
  const myListsBtn = document.getElementById('my-lists-btn');
  if (myListsBtn) {
    myListsBtn.addEventListener('click', () => {
      window.showScreen('my-lists-screen');
      loadUserLists();
    });
  }

  // Add event listeners for list management
  setupListManagementListeners();
}

// Setup event listeners for list management
function setupListManagementListeners() {
  // Create new list
  const createListBtn = document.getElementById('create-list-btn');
  if (createListBtn) {
    createListBtn.addEventListener('click', showCreateListModal);
  }

  // Create list form submission
  const createListForm = document.getElementById('create-list-form');
  if (createListForm) {
    createListForm.addEventListener('submit', handleCreateList);
  }

  // Cancel create list
  const cancelCreateBtn = document.getElementById('cancel-create-list');
  if (cancelCreateBtn) {
    cancelCreateBtn.addEventListener('click', hideCreateListModal);
  }

  // Edit list form submission
  const editListForm = document.getElementById('edit-list-form');
  if (editListForm) {
    editListForm.addEventListener('submit', handleEditList);
  }

  // Cancel edit list
  const cancelEditBtn = document.getElementById('cancel-edit-list');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', hideEditListModal);
  }

  // Add word to list form
  const addWordForm = document.getElementById('add-word-to-list-form');
  if (addWordForm) {
    addWordForm.addEventListener('submit', handleAddWordToList);
  }
}

// Load and display user lists
async function loadUserLists() {
  const listsContainer = document.getElementById('user-lists-container');
  const loadingDiv = document.getElementById('lists-loading');
  const errorDiv = document.getElementById('lists-error');

  if (loadingDiv) loadingDiv.style.display = 'block';
  if (errorDiv) errorDiv.style.display = 'none';
  if (listsContainer) listsContainer.innerHTML = '';

  const result = await getUserLists();

  if (loadingDiv) loadingDiv.style.display = 'none';

  if (!result.success) {
    if (errorDiv) {
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
    }
    return;
  }

  currentLists = result.data;
  renderUserLists();
}

// Render user lists
function renderUserLists() {
  const listsContainer = document.getElementById('user-lists-container');
  if (!listsContainer) return;

  if (currentLists.length === 0) {
    listsContainer.innerHTML = '<p class="no-lists">No lists created yet. Create your first list!</p>';
    return;
  }

  let html = '';
  currentLists.forEach(list => {
    html += `
      <div class="list-card" data-list-id="${list.id}">
        <div class="list-header">
          <h3 class="list-name">${escapeHtml(list.name)}</h3>
          <div class="list-actions">
            <button class="edit-list-btn" data-list-id="${list.id}" data-list-name="${escapeHtml(list.name)}">Edit</button>
            <button class="delete-list-btn" data-list-id="${list.id}" data-list-name="${escapeHtml(list.name)}">Delete</button>
          </div>
        </div>
        <div class="list-meta">
          <span class="list-date">Created: ${new Date(list.created_at).toLocaleDateString()}</span>
        </div>
        <button class="view-list-btn" data-list-id="${list.id}" data-list-name="${escapeHtml(list.name)}">View Words</button>
      </div>
    `;
  });

  listsContainer.innerHTML = html;

  // Add event listeners to list cards
  document.querySelectorAll('.view-list-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const listId = e.target.getAttribute('data-list-id');
      const listName = e.target.getAttribute('data-list-name');
      showListDetail(listId, listName);
    });
  });

  document.querySelectorAll('.edit-list-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const listId = e.target.getAttribute('data-list-id');
      const listName = e.target.getAttribute('data-list-name');
      showEditListModal(listId, listName);
    });
  });

  document.querySelectorAll('.delete-list-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const listId = e.target.getAttribute('data-list-id');
      const listName = e.target.getAttribute('data-list-name');
      handleDeleteList(listId, listName);
    });
  });
}

// Show list detail view
async function showListDetail(listId, listName) {
  currentListId = listId;
  
  // Update list detail header
  const listDetailTitle = document.getElementById('list-detail-title');
  if (listDetailTitle) {
    listDetailTitle.textContent = listName;
  }

  window.showScreen('list-detail-screen');
  await loadListWords(listId);
}

// Load words for a specific list
async function loadListWords(listId) {
  const wordsContainer = document.getElementById('list-words-container');
  const loadingDiv = document.getElementById('list-words-loading');
  const errorDiv = document.getElementById('list-words-error');

  if (loadingDiv) loadingDiv.style.display = 'block';
  if (errorDiv) errorDiv.style.display = 'none';
  if (wordsContainer) wordsContainer.innerHTML = '';

  const result = await getListWords(listId);

  if (loadingDiv) loadingDiv.style.display = 'none';

  if (!result.success) {
    if (errorDiv) {
      errorDiv.textContent = result.error;
      errorDiv.style.display = 'block';
    }
    return;
  }

  currentListWords = result.data;
  renderListWords();
}

// Render words in a list
function renderListWords() {
  const wordsContainer = document.getElementById('list-words-container');
  if (!wordsContainer) return;

  if (currentListWords.length === 0) {
    wordsContainer.innerHTML = '<p class="no-words">No words in this list yet. Add some words!</p>';
    return;
  }

  let html = `
    <div class="words-table">
      <div class="words-header">
        <span>Word</span>
        <span>Added</span>
        <span>Actions</span>
      </div>
  `;

  currentListWords.forEach(wordItem => {
    html += `
      <div class="word-row" data-word-id="${wordItem.id}">
        <span class="word-text">${escapeHtml(wordItem.word)}</span>
        <span class="word-date">${new Date(wordItem.added_at).toLocaleDateString()}</span>
        <span class="word-actions">
          <button class="remove-word-btn" data-word-id="${wordItem.id}" data-word="${escapeHtml(wordItem.word)}">➖</button>
        </span>
      </div>
    `;
  });

  html += '</div>';
  wordsContainer.innerHTML = html;

  // Add event listeners for remove buttons
  document.querySelectorAll('.remove-word-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wordId = e.target.getAttribute('data-word-id');
      const word = e.target.getAttribute('data-word');
      handleRemoveWordFromList(wordId, word);
    });
  });
}

// Modal functions
function showCreateListModal() {
  const modal = document.getElementById('create-list-modal');
  if (modal) {
    modal.style.display = 'block';
    document.getElementById('new-list-name').focus();
  }
}

function hideCreateListModal() {
  const modal = document.getElementById('create-list-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('new-list-name').value = '';
  }
}

function showEditListModal(listId, listName) {
  const modal = document.getElementById('edit-list-modal');
  if (modal) {
    modal.style.display = 'block';
    document.getElementById('edit-list-id').value = listId;
    document.getElementById('edit-list-name').value = listName;
    document.getElementById('edit-list-name').focus();
  }
}

function hideEditListModal() {
  const modal = document.getElementById('edit-list-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('edit-list-name').value = '';
    document.getElementById('edit-list-id').value = '';
  }
}

// Event handlers
async function handleCreateList(e) {
  e.preventDefault();
  
  const nameInput = document.getElementById('new-list-name');
  const name = nameInput.value.trim();
  
  if (!name) {
    alert('Please enter a list name.');
    return;
  }

  const result = await createUserList(name);
  
  if (result.success) {
    hideCreateListModal();
    showNotification('List created successfully!');
    loadUserLists(); // Refresh the lists
  } else {
    alert(`Error creating list: ${result.error}`);
  }
}

async function handleEditList(e) {
  e.preventDefault();
  
  const listId = document.getElementById('edit-list-id').value;
  const nameInput = document.getElementById('edit-list-name');
  const name = nameInput.value.trim();
  
  if (!name) {
    alert('Please enter a list name.');
    return;
  }

  const result = await updateUserList(listId, name);
  
  if (result.success) {
    hideEditListModal();
    showNotification('List updated successfully!');
    loadUserLists(); // Refresh the lists
  } else {
    alert(`Error updating list: ${result.error}`);
  }
}

async function handleDeleteList(listId, listName) {
  if (!confirm(`Are you sure you want to delete the list "${listName}"? This will also delete all words in the list.`)) {
    return;
  }

  const result = await deleteUserList(listId);
  
  if (result.success) {
    showNotification('List deleted successfully!');
    loadUserLists(); // Refresh the lists
  } else {
    alert(`Error deleting list: ${result.error}`);
  }
}

async function handleAddWordToList(e) {
  e.preventDefault();
  
  const wordInput = document.getElementById('new-word-input');
  const word = wordInput.value.trim();
  
  if (!word) {
    alert('Please enter a word.');
    return;
  }

  if (!currentListId) {
    alert('No list selected.');
    return;
  }

  const result = await addWordToList(currentListId, word);
  
  if (result.success) {
    wordInput.value = '';
    showNotification('Word added successfully!');
    loadListWords(currentListId); // Refresh the words
  } else {
    alert(`Error adding word: ${result.error}`);
  }
}

async function handleRemoveWordFromList(wordId, word) {
  if (!confirm(`Remove "${word}" from this list?`)) {
    return;
  }

  const result = await removeWordFromList(currentListId, wordId);
  
  if (result.success) {
    showNotification('Word removed successfully!');
    loadListWords(currentListId); // Refresh the words
  } else {
    alert(`Error removing word: ${result.error}`);
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally accessible
window.initializeUserLists = initializeUserLists;