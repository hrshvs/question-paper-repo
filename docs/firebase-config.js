/**
 * Firebase Configuration for QPR Contribution Portal
 * 
 * SECURITY NOTE:
 * These API keys are safe to commit to public repositories. Firebase client API keys
 * are designed to be public and security is enforced through:
 * - Authorized domains (only iiserm.github.io can use this)
 * - Authentication rules (only @iisermohali.ac.in emails)
 * - Firebase Security Rules (if using database)
 * 
 * See: https://firebase.google.com/docs/projects/api-keys
 * 
 * SETUP INSTRUCTIONS:
 * 1. Replace the placeholder values below with your actual Firebase project credentials
 * 2. Get these values from: Firebase Console > Project Settings > General > Your apps > Web app
 * 3. Make sure Google Sign-In is enabled in Firebase Console > Authentication > Sign-in method
 */
const firebaseConfig = {
    apiKey: "AIzaSyAplh4EHlb_7H7S2S5KOWE8upyjIbsinE4",
    authDomain: "qpr-iiserm.firebaseapp.com",
    projectId: "qpr-iiserm",
    storageBucket: "qpr-iiserm.firebasestorage.app",
    messagingSenderId: "104107170996",
    appId: "1:104107170996:web:ea2e1b723e5437d61d8be1",
    measurementId: "G-SCQZCXGGWX"
  };
  
  

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export auth instance for use in other files
const auth = firebase.auth();

// Configure Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
// Force account selection every time
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

console.log('Firebase initialized successfully');

