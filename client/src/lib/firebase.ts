import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyPlaceholderKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "creator-growth-ai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "creator-growth-ai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "895071732396",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:895071732396:web:85203261ebd1a263201509"
};

// Singleton pattern to prevent duplicate app initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
