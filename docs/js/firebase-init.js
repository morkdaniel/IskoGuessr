// firebase-init.js
// Import Firebase v9 modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  connectAuthEmulator 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  connectFirestoreEmulator,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYJSr2w4x0aVqs5VsVw9HSwf5CYmjJy4I",
  authDomain: "iskoguessr-f5438.firebaseapp.com",
  projectId: "iskoguessr-f5438",
  storageBucket: "iskoguessr-f5438.firebasestorage.app",
  messagingSenderId: "980522985667",
  appId: "1:980522985667:web:1fd119ba18fd0b0c1c9a76"
};

// Initialize Firebase
console.log('Initializing Firebase...');

let app;
let auth;
let db;
let googleProvider;

try {
  // Initialize Firebase app
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');

  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  
  console.log('✅ Firebase services initialized');

  // Configure Google provider with additional scopes
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  
  // Optional: Set custom parameters for Google sign-in
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  console.log('✅ Google provider configured');

} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// Make Firebase services available globally
window.auth = auth;
window.db = db;
window.googleProvider = googleProvider;

// Make Firebase functions available globally
window.signInWithPopup = signInWithPopup;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.addDoc = addDoc;
window.collection = collection;
window.getDocs = getDocs;
window.query = query;
window.orderBy = orderBy;
window.limit = limit;
window.where = where;
window.serverTimestamp = serverTimestamp;

// Additional utility functions
window.getFirebaseApp = () => app;
window.getFirebaseAuth = () => auth;
window.getFirebaseDb = () => db;

console.log('✅ Firebase functions made globally available');

// Connection status tracking
let isFirebaseReady = false;

// Function to check if Firebase is ready
window.isFirebaseReady = () => isFirebaseReady;

// Wait for Firebase to be fully ready
const initializeFirebaseConnection = async () => {
  try {
    console.log('🔄 Testing Firebase connection...');
    
    // Test Firestore connection by attempting to read from a collection
    const testQuery = query(
      collection(db, 'connection-test'),
      limit(1)
    );
    
    // This will establish the connection
    await getDocs(testQuery);
    
    isFirebaseReady = true;
    console.log('✅ Firebase connection established');
    
    // Dispatch custom event to notify other parts of the app
    window.dispatchEvent(new CustomEvent('firebaseReady', {
      detail: { 
        auth, 
        db, 
        googleProvider,
        timestamp: new Date().toISOString()
      }
    }));
    
  } catch (error) {
    console.warn('⚠️ Firebase connection test failed (this is normal on first load):', error.message);
    isFirebaseReady = true; // Set to true anyway, connection will be established when needed
    
    // Still dispatch the event
    window.dispatchEvent(new CustomEvent('firebaseReady', {
      detail: { 
        auth, 
        db, 
        googleProvider,
        timestamp: new Date().toISOString()
      }
    }));
  }
};

// Auth state change listener with enhanced logging
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('🔑 Firebase Auth: User signed in');
    console.log('  👤 Name:', user.displayName);
    console.log('  📧 Email:', user.email);
    console.log('  🆔 UID:', user.uid);
    
    // Dispatch custom event for user sign in
    window.dispatchEvent(new CustomEvent('userSignedIn', {
      detail: { user }
    }));
  } else {
    console.log('🚪 Firebase Auth: User signed out');
    
    // Dispatch custom event for user sign out
    window.dispatchEvent(new CustomEvent('userSignedOut'));
  }
});

// Error handling for auth errors
auth.onIdTokenChanged((user) => {
  if (user) {
    // Refresh token periodically to maintain session
    user.getIdToken(true).catch((error) => {
      console.error('Token refresh failed:', error);
    });
  }
});

// Initialize connection test
initializeFirebaseConnection();

// Export for ES6 modules (if needed)
export { 
  app, 
  auth, 
  db, 
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp
};

// Development/Debug helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🛠️ Development mode detected');
  
  // Add debug functions to window for testing
  window.firebaseDebug = {
    testAuth: async () => {
      console.log('Testing auth state:', auth.currentUser);
      return auth.currentUser;
    },
    testFirestore: async () => {
      try {
        const testDoc = await addDoc(collection(db, 'debug-test'), {
          message: 'Debug test',
          timestamp: serverTimestamp()
        });
        console.log('Firestore test successful:', testDoc.id);
        return true;
      } catch (error) {
        console.error('Firestore test failed:', error);
        return false;
      }
    },
    getConnectionStatus: () => ({
      isReady: isFirebaseReady,
      currentUser: auth.currentUser,
      authReady: !!auth,
      dbReady: !!db
    })
  };
  
  console.log('🐛 Debug functions available at window.firebaseDebug');
}

console.log('🚀 Firebase initialization complete');