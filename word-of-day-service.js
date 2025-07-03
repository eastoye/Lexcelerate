// Word of the Day service - centralized for all users
const BACKEND_WORD_API = '/api/word-of-day'; // Backend endpoint for word of the day

// Fallback words if API fails
const FALLBACK_WORDS = [
  { word: "serendipity", definition: "The occurrence and development of events by chance in a happy or beneficial way." },
  { word: "eloquence", definition: "Fluent or persuasive speaking or writing." },
  { word: "ephemeral", definition: "Lasting for a very short time." },
  { word: "labyrinth", definition: "A complicated network of paths or passages; a maze." },
  { word: "mellifluous", definition: "Sweet or musical; pleasant to hear." },
  { word: "quintessential", definition: "Representing the most perfect example of a quality or class." },
  { word: "ubiquitous", definition: "Present, appearing, or found everywhere." },
  { word: "perspicacious", definition: "Having a ready insight into and understanding of things." },
  { word: "magnanimous", definition: "Very generous or forgiving, especially toward a rival or less powerful person." },
  { word: "effervescent", definition: "Vivacious and enthusiastic; giving off bubbles."  }
];

// Get current date string for cache key
function getCurrentDateString() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Fetch word of the day from backend API
async function fetchWordOfTheDayFromAPI() {
  try {
    const response = await fetch(BACKEND_WORD_API);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      word: data.word,
      definition: data.definition || "Definition not available"
    };
  } catch (error) {
    console.error('Error fetching word of the day from API:', error);
    return null;
  }
}

// Get fallback word based on date (ensures same word for all users on same day)
function getFallbackWordOfTheDay() {
  const today = getCurrentDateString();
  const dateHash = today.split('-').reduce((acc, part) => acc + parseInt(part), 0);
  const index = dateHash % FALLBACK_WORDS.length;
  return FALLBACK_WORDS[index];
}

// Get word of the day (cached for 24 hours)
export async function getWordOfTheDay() {
  const today = getCurrentDateString();
  const cacheKey = `wotd_${today}`;
  
  // Check if we have today's word cached
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error parsing cached word of the day:', error);
    }
  }
  
  // Try to fetch from backend API
  let wordData = await fetchWordOfTheDayFromAPI();
  
  // If API fails, use fallback
  if (!wordData) {
    wordData = getFallbackWordOfTheDay();
  }
  
  // Cache the result
  localStorage.setItem(cacheKey, JSON.stringify(wordData));
  
  // Clean up old cache entries
  cleanupOldWordCache();
  
  return wordData;
}

// Clean up old word of the day cache entries
function cleanupOldWordCache() {
  const keys = Object.keys(localStorage);
  const wotdKeys = keys.filter(key => key.startsWith('wotd_'));
  const today = getCurrentDateString();
  
  wotdKeys.forEach(key => {
    if (key !== `wotd_${today}`) {
      localStorage.removeItem(key);
    }
  });
}