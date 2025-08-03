// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCaqb2xVon5Lq90Z5eB1OcteZ_OjJy1cW8",
  authDomain: "lexcelerate-35eba.firebaseapp.com",
  projectId: "lexcelerate-35eba",
  storageBucket: "lexcelerate-35eba.firebasestorage.app",
  messagingSenderId: "352872440845",
  appId: "1:352872440845:web:3531762a2cc65441e9a144",
  measurementId: "G-FKTS29MLMS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;