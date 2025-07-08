// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2uVmtHzyxUwTU9_ldnBLfUMpSC3rNAbI",
  authDomain: "lexcelerate-3ef25.firebaseapp.com",
  projectId: "lexcelerate-3ef25",
  storageBucket: "lexcelerate-3ef25.appspot.com",
  messagingSenderId: "747558295590",
  appId: "1:747558295590:web:98dfdae2044fc91edb6ee7",
  measurementId: "G-PMEEEPN24K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Export the auth service for use in other files
export { auth };
export default app;