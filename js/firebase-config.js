// Firebase Configuration and Initialization
// This file initializes Firebase services for the RINCOTEC POS application

// Import Firebase SDK (loaded via CDN in HTML)
// Make sure to include these scripts in your HTML files:
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>

// Firebase configuration object
// Credentials from Firebase Console - rincotec-pos project
const firebaseConfig = {
    apiKey: "AIzaSyC0fvZPJIl3p1y8Ojb1ECMPm1C_yakby7w",
    authDomain: "rincotec-pos.firebaseapp.com",
    projectId: "rincotec-pos",
    storageBucket: "rincotec-pos.firebasestorage.app",
    messagingSenderId: "568549111304",
    appId: "1:568549111304:web:6c2cc0eec7f7de4e8a83bd"
};

// Initialize Firebase
let app, db, auth;

try {
    app = firebase.initializeApp(firebaseConfig);

    // Initialize Firestore
    if (firebase.firestore) {
        db = firebase.firestore();
    } else {
        console.error("❌ Firebase Firestore module not loaded");
    }

    // Initialize Auth
    if (firebase.auth) {
        auth = firebase.auth();
    } else {
        console.error("❌ Firebase Auth module not loaded");
    }

    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    // Don't alert immediately to avoid annoying popups, let the UI handle it
}

// Export for use in other modules
window.firebaseApp = app;
window.firebaseDB = db;
window.firebaseAuth = auth;

// Enable offline persistence for better user experience
if (db) {
    db.enablePersistence()
        .then(() => {
            console.log('✅ Offline persistence enabled');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ The current browser does not support persistence.');
            }
        });
}
