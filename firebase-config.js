// ============================================
// FIREBASE CONFIGURATION - SHARED ACROSS ALL PAGES
// ============================================

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2fDidxV42Ha9tYqAuR8m6RpE8umuqUW0",
  authDomain: "expensetracker-f263c.firebaseapp.com",
  projectId: "expensetracker-f263c",
  storageBucket: "expensetracker-f263c.firebasestorage.app",
  messagingSenderId: "590253129599",
  appId: "1:590253129599:web:04f25bc65eec5e1acf244a"
};

// Global Firebase instances (shared across all scripts)
let auth = null;
let db = null;
let useFirebase = false;

// Initialize Firebase (only once!)
function initializeFirebase() {
  // Check if already initialized
  if (firebase.apps && firebase.apps.length > 0) {
    console.log('Firebase already initialized');
    auth = firebase.auth();
    db = firebase.firestore();
    useFirebase = true;
    return true;
  }
  
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    useFirebase = true;
    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    useFirebase = false;
    return false;
  }
}

// Auto-initialize when this script loads
if (typeof firebase !== 'undefined') {
  initializeFirebase();
}