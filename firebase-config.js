// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBg-YnAq82UvVH1N6On6XrcdQRT9Rd6aeY",
    authDomain: "chess-game-online-a961a.firebaseapp.com",
    databaseURL: "https://chess-game-online-a961a-default-rtdb.firebaseio.com",
    projectId: "chess-game-online-a961a",
    storageBucket: "chess-game-online-a961a.firebasestorage.app",
    messagingSenderId: "840132781218",
    appId: "1:840132781218:web:ec5d8dcace7eb2278923fb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
