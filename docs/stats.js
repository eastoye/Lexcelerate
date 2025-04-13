// stats.js
export function updateProgressSummary(wordCatalogue) {
  const summaryDiv = document.getElementById('progress-summary');
  let totalAttempts = 0, totalCorrectFirstTry = 0;
  wordCatalogue.forEach(wordObj => {
    totalAttempts += wordObj.totalAttempts;
    totalCorrectFirstTry += wordObj.correctFirstTryCount;
  });
  let progress = totalAttempts > 0 ? ((totalCorrectFirstTry / totalAttempts) * 100).toFixed(1) : 0;
  summaryDiv.textContent = `Overall First-Attempt Accuracy: ${progress}%`;
}

export function updateStatsList(wordCatalogue) {
  const statsListDiv = document.getElementById('stats-list');
  let html = wordCatalogue.length === 0
    ? '<p>No words added.</p>'
    : wordCatalogue.map((wordObj, i) => `
      <div class="word-stat">
        <strong>${wordObj.word}</strong> ${Object.keys(wordObj.mistakes).length > 0 ? '!' : ''}
        (Score: ${wordObj.score})
        <button class="toggle-details" data-index="${i}">▼</button>
        <button class="delete-word" data-index="${i}">Delete</button>
        <div class="details" id="details-${i}">
          <p>Total Attempts: ${wordObj.totalAttempts}</p>
          <p>Correct on First Try: ${wordObj.correctFirstTryCount}</p>
          <p>Streak: ${wordObj.streak}</p>
          ${Object.keys(wordObj.mistakes).length > 0 
            ? `<p>Mistakes:</p><ul>${Object.entries(wordObj.mistakes).map(([k, v]) => `<li>${k} : ${v} time(s)</li>`).join('')}</ul>`
            : `<p>No mistakes recorded.</p>`
          }
        </div>
      </div>`).join("");
  statsListDiv.innerHTML = html;

  // Using event delegation on stats-list container:
  statsListDiv.addEventListener('click', (event) => {
    if (event.target.matches('.toggle-details')) {
      const idx = event.target.getAttribute('data-index');
      const detailsDiv = document.getElementById('details-' + idx);
      detailsDiv.style.display = (detailsDiv.style.display === 'block') ? 'none' : 'block';
      event.target.textContent = (detailsDiv.style.display === 'block') ? '▲' : '▼';
    } else if (event.target.matches('.delete-word')) {
      const idx = event.target.getAttribute('data-index');
      if (confirm(`Delete word "${wordCatalogue[idx].word}"?`)) {
        wordCatalogue.splice(idx, 1);
        // Call your save function (imported from catalogue.js if needed)
        localStorage.setItem("wordCatalogue_" + localStorage.getItem('currentUser'), JSON.stringify(wordCatalogue));
        updateStatsList(wordCatalogue);
      }
    }
  });
}

export function exportCatalogue(wordCatalogue) {
  const exportData = JSON.stringify(wordCatalogue, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(exportData).then(() => {
      alert("Catalogue exported to clipboard");
    }).catch(() => {
      prompt("Copy the following JSON:", exportData);
    });
  } else {
    prompt("Copy the following JSON:", exportData);
  }
}

export function importCatalogue(callback) {
  const importData = prompt("Paste your catalogue JSON here:");
  if (importData) {
    try {
      const imported = JSON.parse(importData);
      if (Array.isArray(imported)) {
        callback(imported); // Pass the imported catalogue to the caller
      } else {
        alert("Invalid data format.");
      }
    } catch (e) {
      alert("Error parsing JSON.");
    }
  }
}
