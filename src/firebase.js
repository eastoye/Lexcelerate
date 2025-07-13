// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyA2uVmtHzyxUwTU9_ldnBLfUMpSC3rNAbI",
  authDomain: "lexcelerate-3ef25.firebaseapp.com",
  projectId: "lexcelerate-3ef25",
  storageBucket: "lexcelerate-3ef25.firebasestorage.app",
  messagingSenderId: "747558295590",
  appId: "1:747558295590:web:98dfdae2044fc91edb6ee7",
  measurementId: "G-PMEEEPN24K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;