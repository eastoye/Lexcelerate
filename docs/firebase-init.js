// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaqb2xVon5Lq90Z5eB1OcteZ_OjJy1cW8",
  authDomain: "lexcelerate-35eba.firebaseapp.com",
  projectId: "lexcelerate-35eba",
  storageBucket: "lexcelerate-35eba.firebasestorage.app",
  messagingSenderId: "352872440845",
  appId: "1:352872440845:web:3531762a2cc65441e9a144",
  measurementId: "G-FKTS29MLMS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
