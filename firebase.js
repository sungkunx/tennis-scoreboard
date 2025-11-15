// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBapayaRT7NqMK-rvn7pTmkGF0BKp_2byQ",
    authDomain: "tennis-scoreboard-40821.firebaseapp.com",
    projectId: "tennis-scoreboard-40821",
    storageBucket: "tennis-scoreboard-40821.firebasestorage.app",
    messagingSenderId: "1009507940915",
    appId: "1:1009507940915:web:33af346dcf338fda364146"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = firebase.firestore();
