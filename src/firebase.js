// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCvVPDMm5kWA49jQZhG8kAs9oNkqRVoBEk",
  authDomain: "boss-foundation.firebaseapp.com",
  projectId: "boss-foundation",
  storageBucket: "boss-foundation.firebasestorage.app",
  messagingSenderId: "68368947662",
  appId: "1:68368947662:web:561216a4b4675d7123339f",
  measurementId: "G-VBJJK9N84G"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
