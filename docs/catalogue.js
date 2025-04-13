// catalogue.js
export function saveCatalogue(currentUser, wordCatalogue) {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    localStorage.setItem(key, JSON.stringify(wordCatalogue));
    // (Optional: call your cloud-save function here)
  }
}

export function loadUserCatalogue(currentUser) {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    let catalogue = JSON.parse(localStorage.getItem(key)) || [];
    // Ensure each word has proper default values:
    catalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.mistakes) wordObj.mistakes = {};
      if (!wordObj.nextReview) wordObj.nextReview = Date.now();
      if (!wordObj.interval) wordObj.interval = 1;
    });
    // Save it back in case defaults needed to be applied:
    saveCatalogue(currentUser, catalogue);
    return catalogue;
  }
  return [];
}
