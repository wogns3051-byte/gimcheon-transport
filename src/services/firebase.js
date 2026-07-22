import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || "").trim(),
  authDomain: String(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || ""
  ).trim(),
  projectId: String(
    import.meta.env.VITE_FIREBASE_PROJECT_ID || ""
  ).trim(),
  storageBucket: String(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || ""
  ).trim(),
  messagingSenderId: String(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ""
  ).trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || "").trim(),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let firebaseApp = null;
let firestoreDb = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig);

  firestoreDb = getFirestore(firebaseApp);
}

export const db = firestoreDb;