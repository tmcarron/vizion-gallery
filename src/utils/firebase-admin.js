import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// ✅ Load Firebase Admin credentials
const serviceAccount = require("./serviceAccountKey.json"); // Ensure this file exists

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();
export { db };
