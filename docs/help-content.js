// project/docs/help-content.js
export const HELP_TEXT = {
  auth: `
    <h3>Sign In / Sign Up</h3>
    <ul>
      <li>Enter your email and password to sign in or create an account.</li>
      <li>Use the link below the form to toggle between sign in and sign up.</li>
      <li>Your data is saved to your account so you can learn anywhere.</li>
    </ul>
  `,

  home: `
    <h3>Home</h3>
    <ul>
      <li>See <strong>Word of the Day</strong>, quick Practice access, and a progress snapshot.</li>
      <li>Tap the Word of the Day to expand details and add it to your catalogue.</li>
      <li>Use the bottom navigation to move between Add Word, Practice, Stats, and Lists.</li>
    </ul>
  `,

  username: `
    <h3>Choose a Username</h3>
    <ul>
      <li>Pick a unique username to complete your profile.</li>
      <li>Usernames must be at least 3 characters and use letters, numbers, or underscores.</li>
      <li>This helps sync your lists and stats across devices.</li>
    </ul>
  `,

  "add-word": `
    <h3>Add Word</h3>
    <ul>
      <li>Enter the word and definition. Optionally add an example sentence, tags, or a source.</li>
      <li>Press <strong>Add Word</strong> to save it to your personal catalogue.</li>
      <li>New words become available immediately in Practice and in your Lists.</li>
    </ul>
  `,

  practice: `
    <h3>Practice</h3>
    <ul>
      <li>Select your <strong>Practice source</strong>: Catalogue, Random, or one of <em>My Lists</em>.</li>
      <li>Type your answer. We check accuracy (and spelling) and update your score.</li>
      <li>Use the <strong>?</strong> help buttons for guidance; use the <strong>Talk</strong> button to hear pronunciation.</li>
      <li>Your streaks and next-review times adapt based on performance.</li>
    </ul>
  `,

  lists: `
    <h3>My Lists</h3>
    <ul>
      <li>Create and manage custom word lists for focused study (e.g., "Legal Terms", "Interview Set").</li>
      <li>Tap a list to view words inside, rename it, or remove items.</li>
      <li>Start Practice directly from a list for targeted sessions.</li>
    </ul>
  `,

  "list-detail": `
    <h3>List Detail</h3>
    <ul>
      <li>Review all words in this list. Tap a word to view/edit details.</li>
      <li>Add new words via the input, or remove with the "−" button.</li>
      <li>Use <strong>Practice</strong> from here to drill just this list.</li>
    </ul>
  `,

  stats: `
    <h3>Stats</h3>
    <ul>
      <li>Track progress: scores, streaks, mistakes, and next-review times.</li>
      <li>Rows mirror the app's premium UI: word pill (left), gold score text, and a tidy remove button.</li>
      <li>Tap a word to see details and fine-tune what you practice next.</li>
      <li>Toggle the Random Trials panel to see ad-hoc practice history.</li>
    </ul>
  `,
};

// Utility to open the modal with the correct content
export function openHelp(helpType) {
  const modal = document.getElementById('help-modal');
  const box = document.getElementById('help-text');
  const text = HELP_TEXT[helpType] || `<p>No help available for: <code>${helpType}</code></p>`;
  if (box) box.innerHTML = text;
  if (modal) modal.style.display = 'block';
}