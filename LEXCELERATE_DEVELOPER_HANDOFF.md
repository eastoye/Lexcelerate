# Lexcelerate Developer Handoff

## 1. Purpose and Main Features

Lexcelerate is a spelling practice web app designed for vocabulary building with spaced repetition. Users hear a word spoken aloud, see a masked/hint version, and type the correct spelling. The app tracks accuracy, streaks, and scores to adaptively prioritize weaker words.

**Main features:**
- Word catalogue with adaptive scoring (spaced repetition-like)
- Random Practice mode using a built-in 315-word dictionary bank
- Custom lists (user-created word collections)
- Smart List Generator (auto-creates lists from lowest-scoring words)
- Word of the Day
- Import/Export catalogue words
- Guest mode (localStorage) and authenticated mode (Supabase)
- Text-to-speech for word pronunciation
- Progressive syllable hints on repeated failures

---

## 2. File and Folder Structure

```
project/
├── docs/                        # Source code (served by Vite)
│   ├── index.html               # Main HTML (all screens/modals)
│   ├── app.js                   # Core app logic (practice, scoring, import/export, helpers)
│   ├── main.js                  # Entry point (auth flow, Supabase sync, guest mode)
│   ├── auth.js                  # Supabase authentication functions
│   ├── supabase-config.js       # Supabase client initialisation
│   ├── supabase-api.js          # Save/load catalogue to/from Supabase
│   ├── user-lists-api.js        # CRUD for custom lists (Supabase + localStorage)
│   ├── user-lists-ui.js         # UI for custom list management
│   ├── smart-list-generator.js  # Smart list creation + practice source selector
│   ├── help-content.js          # Help modal content
│   ├── style.css                # All styles
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker
│   └── bell noises.wav          # Audio feedback
├── dist/                        # Build output (auto-generated)
├── supabase/migrations/         # Database migration files
├── .env                         # Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├── package.json
└── vite.config.js
```

---

## 3. Most Important Files

| File | Controls |
|------|----------|
| `docs/app.js` | Core practice logic, scoring algorithm, word selection, import/export, Word of the Day, helper functions, all practice screen event handlers |
| `docs/main.js` | App boot sequence, auth state management, catalogue loading/saving, guest mode, Supabase sync glue |
| `docs/index.html` | All screen layouts, modals, buttons, form elements |
| `docs/style.css` | Complete visual design, responsive layout, all component styles |
| `docs/smart-list-generator.js` | Practice source dropdown (catalogue/random/custom), smart list generation |
| `docs/user-lists-ui.js` | Custom list detail view, add/remove/import words to lists |
| `docs/user-lists-api.js` | Data layer for custom lists (Supabase for auth users, localStorage for guests) |
| `docs/auth.js` | Sign up, sign in, profile creation, auth state observer |
| `docs/supabase-api.js` | `saveToSupabase()` and `loadFromSupabase()` for the word catalogue |
| `docs/supabase-config.js` | Creates and exports the Supabase client instance |

---

## 4. Where the Word Catalogue is Stored

**In memory:** `window.wordCatalogue` (global array of word objects)

**Persisted to:**
- **Authenticated users:** Supabase table `word_catalogues` (columns: `uid`, `email`, `word_catalogue` as JSON, `updated_at`)
- **Guest users:** localStorage key `lexcelerate_guest_catalogue`

**Save trigger:** `saveCatalogue()` in `app.js` (line ~108) calls `window.saveUserCatalogueToSupabase()` which is set by `main.js` depending on auth state.

**Word object structure:**
```javascript
{
  word: "pied-à-terre",      // Exact spelling preserved
  totalAttempts: 0,
  correctFirstTryCount: 0,
  mistakes: {},              // { "misspelling": count }
  nextReview: Date.now(),    // Timestamp (not currently used for scheduling)
  interval: 1,              // SRS interval (not currently used for scheduling)
  score: 0,                 // 0-100, drives adaptive word selection
  streak: 0                 // Consecutive correct answers
}
```

---

## 5. Where Practice Logic is Handled

**File:** `docs/app.js`

| Component | Line area | Description |
|-----------|-----------|-------------|
| `loadPracticeWord()` | ~660 | Picks the next word based on mode, shows masked prompt, speaks word |
| `getRandomWord()` | ~637 | Weighted random selection from catalogue (lower score = higher weight) |
| Submit button handler | ~748 | Checks answer (case-insensitive), updates score/streak, gives feedback |
| Syllable hint system | ~219-226 | `generateSyllableHint()` reveals syllables progressively on attempt 3+ |
| `getCoveredWord()` | ~207 | Shows underscored masked word for attempts 1-2 |
| Reveal on prompt tap | ~694 | Shows full word for 3 seconds when prompt is tapped |

---

## 6. Where Random Practice Logic is Handled

**File:** `docs/app.js`

| Component | Line area | Description |
|-----------|-----------|-------------|
| `dictionaryWords` array | ~276 (large array) | 315-word bank for random practice |
| `getRandomDictionaryWord()` | After the array | Returns `{ word: randomWord }` from the bank |
| `window.practiceMode` | ~13 | Global flag: `'catalogue'`, `'random'`, or `'custom-list'` |
| Mode switching | `smart-list-generator.js` ~358 | `updatePracticeMode()` sets `window.practiceMode` |
| Random trials tracking | `randomTrials` array (~10) | Tracks attempts/correctness for random words (session only) |
| Add to Catalogue button | ~684 | Delegated click handler adds random word to catalogue |

---

## 7. Where Word of the Day Logic is Handled

**File:** `docs/app.js`

| Component | Line area | Description |
|-----------|-----------|-------------|
| WOTD pool | ~132-153 | Array of ~152 curated words |
| `getWordOfTheDay()` | ~155-160 | Deterministic selection: days since Jan 1 2025 modulo pool length |
| `loadWordOfTheDay()` | ~162-165 | Sets text content of `#wotd` element |
| Click handler | ~170-187 | Fetches definition from API, confirms add, uses `createDefaultWordObject()` |
| `fetchDefinition()` | ~190-205 | Calls `https://api.dictionaryapi.dev/api/v2/entries/en/` |

---

## 8. Where Scoring/Streak/Interval/NextReview Logic is Handled

**File:** `docs/app.js`, inside the submit button handler (~748-803)

**On correct answer (catalogue mode):**
```
totalAttempts++
streak++
basePoints = 1 (or 2 if streak >= 5, or 5 if streak >= 10)
factor = max(1 - 0.2 * currentRevealCount, 0.2)  // penalty for peeking
score += basePoints * factor
score capped at 100
If first attempt: correctFirstTryCount++
```

**On incorrect answer (catalogue mode):**
```
streak = 0
If score > 60: score -= 2
Else: score -= 1
score floored at 0
mistakes[misspelling]++
```

**Word selection weighting** (`getRandomWord()` ~637):
```
weight = (101 - score)  // Lower score = higher probability of being selected
```

**Note:** `interval` and `nextReview` exist on word objects but are not currently used in selection logic. Selection is purely score-weighted random.

---

## 9. Where Import/Export Logic is Handled

**File:** `docs/app.js` (~806-843)

| Feature | Description |
|---------|-------------|
| Export button | Copies full `wordCatalogue` JSON to clipboard |
| Import button | Prompts for input, parses via `parseImportData()`, additive merge with duplicate skipping |
| `parseImportData()` | Accepts: JSON array of strings, JSON array of objects with `.word`, or plain text (one per line) |
| `createDefaultWordObject(word)` | Reusable helper for creating word entries with zeroed stats |
| Import message | Shows "Import complete: X added, Y already existed." |

**Custom list import:** `docs/user-lists-ui.js` - `handleImportWordsToList()` uses same parser, also adds to catalogue if missing.

---

## 10. Where Supabase/Auth/Cloud Sync Logic is Handled

| File | Responsibility |
|------|---------------|
| `docs/supabase-config.js` | Creates Supabase client from `.env` vars |
| `docs/auth.js` | `signUp()`, `signIn()`, `logOut()`, `createProfile()`, `getUserProfile()`, `onAuthStateChange()` |
| `docs/supabase-api.js` | `saveToSupabase(wordCatalogue)` upserts to `word_catalogues` table; `loadFromSupabase()` fetches it |
| `docs/main.js` | Orchestrates: auth state listener loads catalogue on login, saves on changes, manages guest fallback |
| `docs/user-lists-api.js` | Custom lists CRUD: `user_lists` and `user_list_words` tables (or localStorage for guests) |

**Auth flow:** Email/password via Supabase Auth. Username login supported via RPC `get_user_by_username_or_email`.

**Tables:**
- `word_catalogues` - uid, email, word_catalogue (JSON), updated_at
- `profiles` - user profile with username
- `user_lists` - custom list metadata
- `user_list_words` - words belonging to custom lists

---

## 11. Where the Main CSS/Design System is Defined

**File:** `docs/style.css` (single file, ~2000+ lines)

Key sections:
- Root variables / theming at top
- Screen layout (`.screen`, `.home-wrapper`, `.minimal-container`)
- Practice screen styles (`.feedback-area`, `.feedback-correct`, `.feedback-incorrect`)
- Stats screen styles
- Modal styles (`.modal`, `.modal-content`)
- Custom list styles (`.list-row`, `.word-row`, `.words-table`)
- Practice list selector (`.practice-list-selector`, `.dropdown-item`)
- Responsive breakpoints at bottom
- Accessibility/focus styles

---

## 12. Important State Variables and localStorage Keys

**Global window variables:**
| Variable | Set in | Purpose |
|----------|--------|---------|
| `window.wordCatalogue` | main.js / app.js | The word catalogue array (source of truth) |
| `window.practiceMode` | app.js / smart-list-generator.js | Current mode: `'catalogue'`, `'random'`, `'custom-list'` |
| `window.currentUser` | main.js | Authenticated Supabase user object or null |
| `window.isGuestMode` | main.js | Boolean for guest mode |
| `window.currentPracticeListId` | smart-list-generator.js | ID of selected custom list for practice |
| `window.loadPracticeWord` | app.js | Exposed function for mode switcher to call |
| `window.saveCatalogue` | app.js | Exposed save function |
| `window.createDefaultWordObject` | app.js | Exposed helper |
| `window.parseImportData` | app.js | Exposed import parser |
| `window.showScreen` | app.js | Screen navigation function |
| `window.showNotification` | app.js | Toast notification function |
| `window.refreshSmartList` | app.js | Refreshes smart list display |
| `window.getSmartList` | app.js | Gets lowest-scoring words |

**localStorage keys:**
| Key | Purpose |
|-----|---------|
| `lexcelerate_guest_mode` | Boolean flag for guest mode persistence |
| `lexcelerate_guest_catalogue` | JSON word catalogue for guests |
| `lexcelerate_guest_lists` | JSON array of guest custom lists |
| `lexcelerate_guest_list_words_${listId}` | JSON words for a specific guest list |

---

## 13. App Rules That Must Not Be Broken

1. **Never replace the catalogue on import.** Import must always be additive (append new, skip duplicates).
2. **Duplicate checking is case-insensitive** but the stored word preserves exact original spelling (spaces, hyphens, accents, capitals).
3. **Answer checking is case-insensitive** (`toLowerCase()` comparison) but spaces, hyphens, and accents must match exactly.
4. **`window.wordCatalogue` is the single source of truth** for the catalogue. All reads/writes go through this array.
5. **`saveCatalogue()` must be called** after any mutation to `wordCatalogue`.
6. **Score range is 0-100.** Never allow negative or >100.
7. **Streak resets to 0 on any incorrect answer.**
8. **Random Practice mode must pull from `dictionaryWords` array**, not from `wordCatalogue`.
9. **Custom lists store independent word strings**, not references to catalogue objects.
10. **Guest mode uses localStorage; auth mode uses Supabase.** Never mix them.
11. **The `createDefaultWordObject(word)` helper must be used** when creating new catalogue entries (ensures consistent structure).
12. **All UI updates after catalogue changes** should call: `saveCatalogue()`, `updateProgressSummary()`, `updateStatsList()`, `updateStatsSummary()`, `refreshSmartList()`.

---

## 14. Known Fragile Areas

1. **`window.practiceMode` synchronisation:** The mode is set on `window` by `smart-list-generator.js` and read by `app.js`. If either file loads before the other sets the value, mode detection can fail. The `|| 'catalogue'` default on line 13 of `app.js` is the safety net.

2. **`currentWordObj` can be null:** If `loadPracticeWord()` is called before any words exist (empty catalogue in catalogue mode), `currentWordObj` may be null. The practice button has a guard (`wordCatalogue.length === 0` check) but custom list mode may not.

3. **Cross-module function exposure via `window`:** Many functions are shared between modules by attaching to `window`. If load order changes (e.g., Vite chunking), a function may not be available when called. Check that `window.X` exists before calling.

4. **The submit handler (~748) does not guard against `currentWordObj` being null.** If the user somehow clicks submit without a word loaded, it will throw.

5. **Guest mode localStorage has no size limit checking.** Very large catalogues could hit browser limits.

6. **The `randomTrials` array is session-only** (not persisted). Refreshing the page loses random practice history.

7. **`saveCatalogue()` triggers Supabase upsert with the entire catalogue JSON.** Large catalogues mean large payloads on every save.

8. **The Add to Catalogue button (`#add-random-to-catalogue-btn`)** is created dynamically by `smart-list-generator.js`. Its click handler is delegated in `app.js`. If the button ID changes in one file but not the other, it breaks silently.

9. **Import parser (`parseImportData`)** uses `JSON.parse` which will throw on malformed JSON. The try/catch in the import handlers protects against this, but any caller must also wrap in try/catch.

---

## 15. Instructions for Making Small Safe Edits

### General rules:
- **Never replace an entire file.** Make targeted edits to specific functions or sections.
- **Search for existing patterns** before adding new code. The codebase has conventions -- follow them.
- **Test in both guest mode and authenticated mode** after changes that touch catalogue or lists.
- **After any catalogue mutation**, call `saveCatalogue()` and relevant UI update functions.
- **Use `createDefaultWordObject(word)`** whenever adding a word to the catalogue.
- **Use `parseImportData(raw)`** whenever parsing user-provided word input.

### To add a new word to the dictionary bank:
- Edit the `dictionaryWords` array in `docs/app.js` (large array starting around line 276).
- Just add the string to the array. No other changes needed.

### To add a new button/UI element:
1. Add the HTML in `docs/index.html` inside the appropriate screen div.
2. Add the event listener in the appropriate JS file (usually `app.js` for practice/home, `user-lists-ui.js` for lists).
3. Add styling in `docs/style.css`.

### To modify scoring logic:
- Edit the submit handler in `docs/app.js` (around line 748-803).
- The correct-answer block is the `if (userSpelling.toLowerCase() === actualWord.toLowerCase())` branch.
- The incorrect-answer block is the `else` branch.

### To add a new screen:
1. Add a `<div id="my-screen" class="screen" style="display: none;">` in `index.html`.
2. Use `showScreen('my-screen')` to navigate to it.
3. Add a back button with class `back-btn` for navigation.

### To modify what happens after practice answer submission:
- The handler is the `submit-spelling-btn` click listener in `app.js` (~748).
- Correct answers are in the first branch, incorrect in the else branch.
- `window.practiceMode` determines which scoring path runs.

### Common mistakes to avoid:
- Do not use `wordCatalogue = [...]` (replaces reference, breaks other modules holding old reference). Use `wordCatalogue.push()` / `wordCatalogue.splice()`.
- Do not forget that `window.wordCatalogue` and the local `wordCatalogue` variable in `app.js` are the same reference.
- Do not add `async` callbacks directly to `onAuthStateChange` (causes deadlocks). Wrap in `(async () => { ... })()`.
- Do not assume elements exist -- the app uses `showScreen()` to toggle visibility, so elements may be hidden but are always in DOM.
