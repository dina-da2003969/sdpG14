// Import the Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCOD_CNe3AJyyW0welsYAc6v7_xT8UjJmI",
  authDomain: "doha-clinic-32465.firebaseapp.com",
  databaseURL: "https://doha-clinic-32465-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "doha-clinic-32465",
  storageBucket: "doha-clinic-32465.firebasestorage.app",
  messagingSenderId: "424118028422",
  appId: "1:424118028422:web:5d40e912977d5456c62907"
  };
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Export the initialized app for other Firebase services
export default app;
