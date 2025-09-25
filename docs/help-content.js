// project/docs/help-content.js
export const HELP_TEXT = {
  auth: 
    //Sign In / Sign Up//
    `<ul>
      <li>Enter your email and password to sign in or create an account.</li>
      <li>Use the link below the form to switch between sign in and sign up.</li>
      <li>Your words and stats are saved to your account so you can learn anywhere.</li>
    </ul>
  `,

  home: 
    //Home// 
   ` <ul>
      <li>See your <strong>Word of the Day</strong>, quick links to Practice, and your progress snapshot.</li>
      <li>Tap the Word of the Day to expand details or add it to your catalogue.</li>
      <li>Use the bottom navigation bar to move between Add Word, Practice, Stats, and Lists.</li>
    </ul>
  `,

  username: 
    //Choose a Username//
  `  <ul>
      <li>Pick a unique username to complete your profile.</li>
      <li>Usernames must be at least 3 characters long and can include letters, numbers, or underscores.</li>
    </ul>
  `,

  "add-word": 
    //Add Word//
  `  <ul>
      <li>Type in the word and its definition.</li>
      <li>You can also add an example sentence, tags, or a source.</li>
      <li>Press <strong>Add Word</strong> to save it to your catalogue.</li>
      <li>New words are available immediately in Practice and Lists.</li>
    </ul>
  `,

  practice: 
    //Practice//
 `   <ul>
      <li>Choose where to practice from: Catalogue, Random, or one of your Lists.</li>
      <li>Type your answer in the box. The app checks accuracy and updates your score.</li>
      <li>Use the <strong>?</strong> help buttons if you’re stuck.</li>
      <li>Your progress adapts based on how you do.</li>
    </ul>
  `,

  lists: 
    //My Lists//
   ` <ul>
      <li>Create and manage custom word lists for focused study.</li>
      <li>Tap a list to view its words or edit it.</li>
      <li>Start Practice directly from a list for targeted revision.</li>
    </ul>
  `,

  "list-detail": 
    //List Detail//
   ` <ul>
      <li>See all words in this list.</li>
      <li>Tap a word to view or edit it.</li>
      <li>Add new words or remove existing ones.</li>
      <li>Use <strong>Practice</strong> from here to study only this list.</li>
    </ul>
  `,

  stats: 
    //Stats//
  `  <ul>
      <li>See how you’re doing with each word.</li>
      <li>Scores update as you practice.</li>
      <li>Remove a word from tracking if you no longer want to study it.</li>
      <li>Use stats to spot weak areas and focus your practice.</li>
    </ul>
  `,
};

export function openHelp(helpType) {
  const modal = document.getElementById('help-modal');
  const box = document.getElementById('help-text');
  const text = HELP_TEXT[helpType] || `<p>No help available for: <code>${helpType}</code></p>`;
  if (box) box.innerHTML = text;
  if (modal) modal.style.display = 'block';
}
