// firebase.js (ESM version)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgW8ztet-oceEudKRlBbCoqi6fR7ZAwCQ",
  authDomain: "vizion-gallery.firebaseapp.com",
  projectId: "vizion-gallery",
  storageBucket: "vizion-gallery.firebasestorage.app",
  messagingSenderId: "98047441578",
  appId: "1:98047441578:web:434b1bfd872e12e03d6ed3",
  measurementId: "G-HK84GQQ4WM",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
