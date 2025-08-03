// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyCaqb2xVon5Lq90Z5eB1OcteZ_OjJy1cW8",
  authDomain: "lexcelerate-35eba.firebaseapp.com",
  projectId: "lexcelerate-35eba",
  storageBucket: "lexcelerate-35eba.firebasestorage.app",
  messagingSenderId: "352872440845",
  appId: "1:352872440845:web:a4988a04f81d4c13e9a144",
  measurementId: "G-P1JQJS0E3K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;