// practice.js
// Example dictionary array (could be imported from another file or defined here)
const dictionaryWords = ["quixotic", "serendipity", "benevolent", "obfuscate", "pulchritude"];

export function getRandomDictionaryWord() {
  return { word: dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)] };
}

export function getCoveredWord(word) {
  return "_".repeat(word.length);
}

export function splitWordIntoSyllables(word) {
  let syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+|$)/gi);
  return syllables || [word];
}

export function generateSyllableHint(word, attemptCount) {
  let syllables = splitWordIntoSyllables(word);
  let syllablesToReveal = Math.min(attemptCount - 2, syllables.length);
  let hintArray = syllables.map((syl, index) =>
    index < syllablesToReveal ? syl : "_".repeat(syl.length)
  );
  return hintArray.join("-");
}

export function loadPracticeWord(practiceMode, wordCatalogue, randomTrials) {
  let currentWordObj = null;
  if (practiceMode === 'random') {
    currentWordObj = getRandomDictionaryWord();
    let existing = randomTrials.find(t => t.word.toLowerCase() === currentWordObj.word.toLowerCase());
    if (existing) {
      existing.attempts = 0;
      existing.correct = false;
    } else {
      randomTrials.push({ word: currentWordObj.word, attempts: 0, correct: false });
    }
  } else {
    currentWordObj = getRandomWordFromCatalogue(wordCatalogue);
  }
  return currentWordObj;
}

// Helper: choose a random word from the catalogue, weighted by score
export function getRandomWordFromCatalogue(wordCatalogue) {
  const maxScore = 100;
  let totalWeight = 0, weights = [];
  wordCatalogue.forEach(wordObj => {
    let weight = (maxScore + 1) - wordObj.score;
    weights.push(weight);
    totalWeight += weight;
  });
  let random = Math.random() * totalWeight, cumulative = 0;
  for (let i = 0; i < wordCatalogue.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) return wordCatalogue[i];
  }
  return wordCatalogue[0];
}
