// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCvVPDMm5kWA49jQZhG8kAs9oNkqRVoBEk",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "boss-foundation.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "boss-foundation",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "boss-foundation.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "68368947662",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:68368947662:web:561216a4b4675d7123339f",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-VBJJK9N84G"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
