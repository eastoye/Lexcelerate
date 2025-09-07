/**
 * Lexcelerate - Main Application Entry Point
 * 
 * This module serves as the main entry point for the Lexcelerate application.
 * It handles application initialization, authentication state management,
 * and coordinates between different modules.
 */

import { signUp, signIn, signOut, onAuthStateChange, createProfile, getUserProfile } from './auth.js';
import { saveToSupabase, loadFromSupabase } from './supabase-api.js';
import './user-lists-ui.js';
import { initializeSmartListGenerator } from './smart-list-generator.js';
import './app.js';

// ---------------------------
// Application State
// ---------------------------

/**
 * Global application state
 */
const AppState = {
  currentUser: null,
  userProfile: null,
  isSignUpMode: false,
  isInitialized: false
};

// ---------------------------
// Authentication Management
// ---------------------------

/**
 * Authentication state manager
 */
class AuthenticationManager {
  /**
   * Initialize authentication state listener
   */
  static initialize() {
    onAuthStateChange(this.handleAuthStateChange.bind(this));
  }

  /**
   * Handle authentication state changes
   * @param {Object|null} user - The authenticated user or null
   */
  static async handleAuthStateChange(user) {
    if (user) {
      await this.handleUserSignIn(user);
    } else {
      this.handleUserSignOut();
    }
  }

  /**
   * Handle user sign in
   * @param {Object} user - The authenticated user
   */
  static async handleUserSignIn(user) {
    AppState.currentUser = user;
    console.log('User signed in:', user.email);
    
    try {
      // Load user profile
      const profileResult = await getUserProfile();
      if (profileResult.success) {
        AppState.userProfile = profileResult.data;
        
        // Check if user needs to set up username
        if (!AppState.userProfile.username) {
          ScreenManager.showScreen('username-setup-screen');
          return;
        }
      }
      
      // Load user's catalogue and initialize features
      await DataManager.loadUserCatalogue();
      await this.initializeUserFeatures();
      
      // Show home screen and load word of the day
      ScreenManager.showScreen('home-screen');
      if (window.loadWordOfTheDay) {
        window.loadWordOfTheDay();
      }
    } catch (error) {
      console.error('Error during user sign in:', error);
      NotificationManager.showError('Error loading user data');
    }
  }

  /**
   * Handle user sign out
   */
  static handleUserSignOut() {
    AppState.currentUser = null;
    AppState.userProfile = null;
    console.log('User signed out');
    
    // Clear application data
    if (window.wordCatalogue) {
      window.wordCatalogue.length = 0;
    }
    
    ScreenManager.showScreen('auth-screen');
  }

  /**
   * Initialize user-specific features
   */
  static async initializeUserFeatures() {
    // Initialize user lists functionality
    if (window.initializeUserLists) {
      window.initializeUserLists();
    }
    
    // Initialize smart list generator
    initializeSmartListGenerator();
  }
}

// ---------------------------
// Data Management
// ---------------------------

/**
 * Data management utilities
 */
class DataManager {
  /**
   * Load user's catalogue from Supabase
   */
  static async loadUserCatalogue() {
    try {
      const result = await loadFromSupabase();
      if (result.success) {
        window.wordCatalogue = result.data;
        this.ensureWordCatalogueIntegrity();
        console.log('Catalogue loaded from Supabase:', window.wordCatalogue.length, 'words');
      } else {
        console.error('Failed to load catalogue from Supabase:', result.error);
        window.wordCatalogue = [];
      }
    } catch (error) {
      console.error('Error loading catalogue:', error);
      window.wordCatalogue = [];
    }
  }

  /**
   * Save user's catalogue to Supabase
   */
  static async saveUserCatalogue() {
    if (!AppState.currentUser) {
      console.warn('Cannot save catalogue: user not authenticated');
      return;
    }
    
    try {
      const result = await saveToSupabase(window.wordCatalogue);
      if (result.success) {
        console.log('Catalogue saved to Supabase');
      } else {
        console.error('Failed to save catalogue to Supabase:', result.error);
        NotificationManager.showError('Failed to save to cloud storage');
      }
    } catch (error) {
      console.error('Error saving catalogue:', error);
      NotificationManager.showError('Error saving data');
    }
  }

  /**
   * Ensure word catalogue has all required properties
   */
  static ensureWordCatalogueIntegrity() {
    if (!Array.isArray(window.wordCatalogue)) {
      window.wordCatalogue = [];
      return;
    }

    window.wordCatalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.mistakes) wordObj.mistakes = {};
      if (!wordObj.nextReview) wordObj.nextReview = Date.now();
      if (!wordObj.interval) wordObj.interval = 1;
      if (typeof wordObj.totalAttempts !== 'number') wordObj.totalAttempts = 0;
      if (typeof wordObj.correctFirstTryCount !== 'number') wordObj.correctFirstTryCount = 0;
    });
  }
}

// ---------------------------
// Screen Management
// ---------------------------

/**
 * Screen navigation manager
 */
class ScreenManager {
  /**
   * Show specified screen and hide others
   * @param {string} screenId - The ID of the screen to show
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
    } else {
      console.warn(`Screen with ID '${screenId}' not found`);
    }
  }
}

// ---------------------------
// UI Form Handlers
// ---------------------------

/**
 * Authentication form handler
 */
class AuthFormHandler {
  /**
   * Initialize authentication form handlers
   */
  static initialize() {
    this.setupAuthForm();
    this.setupUsernameForm();
    this.setupAuthToggle();
    this.setupKeyboardHandlers();
  }

  /**
   * Setup main authentication form
   */
  static setupAuthForm() {
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    if (authSubmitBtn) {
      authSubmitBtn.addEventListener('click', this.handleAuthSubmit.bind(this));
    }
  }

  /**
   * Setup username setup form
   */
  static setupUsernameForm() {
    const usernameSubmitBtn = document.getElementById('username-submit-btn');
    if (usernameSubmitBtn) {
      usernameSubmitBtn.addEventListener('click', this.handleUsernameSubmit.bind(this));
    }
  }

  /**
   * Setup authentication mode toggle
   */
  static setupAuthToggle() {
    const authToggleLink = document.getElementById('auth-toggle-link');
    if (authToggleLink) {
      authToggleLink.addEventListener('click', this.handleAuthToggle.bind(this));
    }
  }

  /**
   * Setup keyboard event handlers
   */
  static setupKeyboardHandlers() {
    // Auth form keyboard handlers
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    
    if (authEmail) {
      authEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (authPassword) authPassword.focus();
        }
      });
    }

    if (authPassword) {
      authPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAuthSubmit();
        }
      });
    }

    // Username form keyboard handler
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
      usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleUsernameSubmit();
        }
      });
    }
  }

  /**
   * Handle authentication form submission
   */
  static async handleAuthSubmit() {
    const email = this.getInputValue('auth-email');
    const password = this.getInputValue('auth-password');
    
    if (!this.validateAuthInput(email, password)) {
      return;
    }
    
    this.setLoadingState(true);
    
    try {
      const result = AppState.isSignUpMode 
        ? await signUp(email, password)
        : await signIn(email, password);
      
      if (!result.success) {
        this.showAuthError(result.error);
      }
      // Success is handled by the auth state change listener
    } catch (error) {
      this.showAuthError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', error);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Handle username setup form submission
   */
  static async handleUsernameSubmit() {
    const username = this.getInputValue('username-input');
    
    if (!this.validateUsername(username)) {
      return;
    }
    
    this.setUsernameLoadingState(true);
    
    try {
      const result = await createProfile(username);
      
      if (!result.success) {
        const errorMessage = result.error.includes('duplicate key')
          ? 'This username is already taken. Please choose another.'
          : result.error;
        this.showUsernameError(errorMessage);
      } else {
        await this.handleSuccessfulUsernameSetup();
      }
    } catch (error) {
      this.showUsernameError('An unexpected error occurred. Please try again.');
      console.error('Username setup error:', error);
    } finally {
      this.setUsernameLoadingState(false);
    }
  }

  /**
   * Handle successful username setup
   */
  static async handleSuccessfulUsernameSetup() {
    // Reload profile and continue to home
    const profileResult = await getUserProfile();
    if (profileResult.success) {
      AppState.userProfile = profileResult.data;
      const welcomeMessage = document.getElementById('welcome-message');
      if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${AppState.userProfile.username}!`;
      }
    }
    
    await DataManager.loadUserCatalogue();
    ScreenManager.showScreen('home-screen');
    
    if (window.loadWordOfTheDay) {
      window.loadWordOfTheDay();
    }
  }

  /**
   * Handle authentication mode toggle
   * @param {Event} e - The click event
   */
  static handleAuthToggle(e) {
    e.preventDefault();
    AppState.isSignUpMode = !AppState.isSignUpMode;
    
    this.updateAuthUI();
    this.clearAuthForm();
    
    // Re-attach event listener to the new link
    const newToggleLink = document.getElementById('auth-toggle-link');
    if (newToggleLink) {
      newToggleLink.addEventListener('click', this.handleAuthToggle.bind(this));
    }
  }

  /**
   * Update authentication UI based on current mode
   */
  static updateAuthUI() {
    const elements = {
      title: document.getElementById('auth-title'),
      submitBtn: document.getElementById('auth-submit-btn'),
      toggleText: document.getElementById('auth-toggle')
    };

    if (AppState.isSignUpMode) {
      if (elements.title) elements.title.textContent = 'Sign Up for Lexcelerate';
      if (elements.submitBtn) elements.submitBtn.textContent = 'Sign Up';
      if (elements.toggleText) {
        elements.toggleText.innerHTML = 'Already have an account? <a href="#" id="auth-toggle-link">Sign in</a>';
      }
    } else {
      if (elements.title) elements.title.textContent = 'Sign In to Lexcelerate';
      if (elements.submitBtn) elements.submitBtn.textContent = 'Sign In';
      if (elements.toggleText) {
        elements.toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-toggle-link">Sign up</a>';
      }
    }
  }

  /**
   * Utility methods for form handling
   */
  static getInputValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value.trim() : '';
  }

  static validateAuthInput(email, password) {
    if (!email || !password) {
      this.showAuthError('Please enter both email and password.');
      return false;
    }
    return true;
  }

  static validateUsername(username) {
    if (!username) {
      this.showUsernameError('Please enter a username.');
      return false;
    }
    
    if (username.length < 3) {
      this.showUsernameError('Username must be at least 3 characters long.');
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      this.showUsernameError('Username can only contain letters, numbers, and underscores.');
      return false;
    }
    
    return true;
  }

  static setLoadingState(isLoading) {
    const loadingDiv = document.getElementById('auth-loading');
    const submitBtn = document.getElementById('auth-submit-btn');
    const errorDiv = document.getElementById('auth-error');
    
    if (loadingDiv) loadingDiv.style.display = isLoading ? 'block' : 'none';
    if (submitBtn) submitBtn.disabled = isLoading;
    if (errorDiv && isLoading) errorDiv.style.display = 'none';
  }

  static setUsernameLoadingState(isLoading) {
    const loadingDiv = document.getElementById('username-loading');
    const submitBtn = document.getElementById('username-submit-btn');
    const errorDiv = document.getElementById('username-error');
    
    if (loadingDiv) loadingDiv.style.display = isLoading ? 'block' : 'none';
    if (submitBtn) submitBtn.disabled = isLoading;
    if (errorDiv && isLoading) errorDiv.style.display = 'none';
  }

  static showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  static showUsernameError(message) {
    const errorDiv = document.getElementById('username-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  static clearAuthForm() {
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const errorDiv = document.getElementById('auth-error');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
  }
}

// ---------------------------
// Notification Management
// ---------------------------

/**
 * Notification manager
 */
class NotificationManager {
  /**
   * Show success notification
   * @param {string} message - The message to display
   */
  static showSuccess(message) {
    this.show(message, 'success');
  }

  /**
   * Show error notification
   * @param {string} message - The message to display
   */
  static showError(message) {
    this.show(message, 'error');
  }

  /**
   * Show notification
   * @param {string} message - The message to display
   * @param {string} type - The type of notification
   */
  static show(message, type = 'info') {
    if (window.showNotification) {
      window.showNotification(message);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// ---------------------------
// Practice Mode Integration
// ---------------------------

/**
 * Practice mode dropdown integration
 */
class PracticeModeHandler {
  /**
   * Initialize practice mode dropdown handlers
   */
  static initialize() {
    this.setupDropdownHandlers();
    this.setupKeyboardHandlers();
  }

  /**
   * Setup dropdown click handlers
   */
  static setupDropdownHandlers() {
    document.addEventListener('click', (e) => {
      this.handleDropdownClick(e);
      this.handleOutsideClick(e);
    });
  }

  /**
   * Setup keyboard handlers
   */
  static setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeOpenMenus();
      }
    });
  }

  /**
   * Handle dropdown clicks
   * @param {Event} e - The click event
   */
  static handleDropdownClick(e) {
    // Toggle dropdown
    const trigger = e.target.closest('#current-list-button');
    if (trigger) {
      e.preventDefault();
      this.toggleDropdown(trigger);
      return;
    }

    // Handle menu item selection
    const item = e.target.closest('#practice-source-menu .dropdown-item[role="menuitem"]');
    if (item) {
      this.handleMenuItemSelection(item);
    }
  }

  /**
   * Handle outside clicks to close dropdown
   * @param {Event} e - The click event
   */
  static handleOutsideClick(e) {
    const openMenu = document.querySelector('#practice-source-menu[aria-hidden="false"]');
    if (openMenu && !openMenu.contains(e.target) && !e.target.closest('#current-list-button')) {
      this.closeOpenMenus();
    }
  }

  /**
   * Toggle dropdown visibility
   * @param {Element} trigger - The trigger button
   */
  static toggleDropdown(trigger) {
    const wrapper = trigger.closest('.practice-list-selector');
    const menu = wrapper?.querySelector('#practice-source-menu');
    if (!menu) return;

    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!isOpen));
    menu.style.display = isOpen ? 'none' : 'block';
    menu.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
  }

  /**
   * Handle menu item selection
   * @param {Element} item - The selected menu item
   */
  static handleMenuItemSelection(item) {
    const wrapper = item.closest('.practice-list-selector');
    const trigger = wrapper?.querySelector('#current-list-button');
    const menu = wrapper?.querySelector('#practice-source-menu');
    const source = item.dataset.source;
    const action = item.dataset.action;

    if (source) {
      this.updateButtonLabel(trigger, source);
      this.dispatchSourceChangeEvent(source);
    } else if (action === 'open-lists') {
      if (window.showScreen) {
        window.showScreen('my-lists-screen');
      }
    }

    this.closeDropdown(trigger, menu);
  }

  /**
   * Update button label based on source
   * @param {Element} trigger - The trigger button
   * @param {string} source - The selected source
   */
  static updateButtonLabel(trigger, source) {
    if (!trigger) return;

    const icon = source === 'random' ? '🎲' : '📚';
    const label = source === 'random' ? 'Random Words' : 'Catalogue';
    const labelElement = trigger.querySelector('span:first-child');
    
    if (labelElement) {
      labelElement.textContent = `${icon} ${label}`;
    }
  }

  /**
   * Dispatch practice source change event
   * @param {string} source - The selected source
   */
  static dispatchSourceChangeEvent(source) {
    document.dispatchEvent(new CustomEvent('practiceSourceChanged', { 
      detail: { source } 
    }));
  }

  /**
   * Close dropdown
   * @param {Element} trigger - The trigger button
   * @param {Element} menu - The dropdown menu
   */
  static closeDropdown(trigger, menu) {
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (menu) {
      menu.style.display = 'none';
      menu.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Close all open menus
   */
  static closeOpenMenus() {
    const openMenu = document.querySelector('#practice-source-menu[aria-hidden="false"]');
    if (openMenu) {
      const trigger = document.querySelector('#current-list-button[aria-expanded="true"]');
      this.closeDropdown(trigger, openMenu);
    }
  }
}

// ---------------------------
// Logout Handler
// ---------------------------

/**
 * Logout functionality
 */
class LogoutHandler {
  /**
   * Initialize logout handler
   */
  static initialize() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
  }

  /**
   * Handle logout button click
   */
  static async handleLogout() {
    try {
      const result = await signOut();
      if (!result.success) {
        console.error('Logout error:', result.error);
        NotificationManager.showError('Error signing out');
      }
    } catch (error) {
      console.error('Logout error:', error);
      NotificationManager.showError('Error signing out');
    }
  }
}

// ---------------------------
// Application Initialization
// ---------------------------

/**
 * Main application initializer
 */
class ApplicationInitializer {
  /**
   * Initialize the entire application
   */
  static initialize() {
    if (AppState.isInitialized) {
      console.warn('Application already initialized');
      return;
    }

    console.log('Initializing Lexcelerate application...');
    
    // Initialize core systems
    AuthenticationManager.initialize();
    AuthFormHandler.initialize();
    PracticeModeHandler.initialize();
    LogoutHandler.initialize();
    
    // Set up global API
    this.setupGlobalAPI();
    
    // Show initial screen
    ScreenManager.showScreen('auth-screen');
    
    AppState.isInitialized = true;
    console.log('Application initialization complete');
  }

  /**
   * Setup global API for backward compatibility
   */
  static setupGlobalAPI() {
    // Make functions globally accessible
    window.currentUser = AppState.currentUser;
    window.userProfile = AppState.userProfile;
    window.saveUserCatalogueToSupabase = DataManager.saveUserCatalogue.bind(DataManager);
    window.loadUserCatalogueFromSupabase = DataManager.loadUserCatalogue.bind(DataManager);
    window.showScreen = ScreenManager.showScreen.bind(ScreenManager);
    
    // Override the original saveCatalogue function to use Supabase
    window.saveCatalogue = DataManager.saveUserCatalogue.bind(DataManager);
  }
}

// ---------------------------
// Application Entry Point
// ---------------------------

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  ApplicationInitializer.initialize();
});

// Initialize auth state listener immediately
AuthenticationManager.initialize();