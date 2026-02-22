
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQ9gafSnJBwuXvIpnOGn4Kwo8YqMkKY0M",
  authDomain: "studio-7642357109-d9026.firebaseapp.com",
  projectId: "studio-7642357109-d9026",
  storageBucket: "studio-7642357109-d9026.firebasestorage.app",
  messagingSenderId: "1076239216683",
  appId: "1:1076239216683:web:a298fa70bb136183217a6e",
  measurementId: "G-ZYZ750JHMB"
};

// Make firebaseConfig available globally
window.firebaseConfig = firebaseConfig;

// Initialize Firebase immediately if the SDK is loaded
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized directly from config file");
    }
}
