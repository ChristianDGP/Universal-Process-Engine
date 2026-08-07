/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Read configuration from VITE_ environment variables or default to firebase-applet-config.json
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

const app = !getApps().length ? initializeApp(config) : getApp();

const customDbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
const databaseId = customDbId && customDbId !== "(default)" ? customDbId : undefined;

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAILS = ["carayag@ugp-ssmso.cl"];

export type UserRole = "admin" | "analyst";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isMock?: boolean;
}

export function getStoredSessionUser(): AppUser | null {
  try {
    const raw = sessionStorage.getItem("upe_session_user");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading stored session user", e);
  }
  return null;
}

export function setStoredSessionUser(user: AppUser | null) {
  if (!user) {
    sessionStorage.removeItem("upe_session_user");
  } else {
    sessionStorage.setItem("upe_session_user", JSON.stringify(user));
  }
}

export function getUserRole(email: string | null | undefined): UserRole {
  if (!email) return "analyst";
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAILS.some((a) => a.toLowerCase() === normalized)) {
    return "admin";
  }
  return "analyst";
}

export async function loginWithGoogle() {
  googleProvider.setCustomParameters({ prompt: "select_account" });
  return await signInWithPopup(auth, googleProvider);
}

export async function logout() {
  setStoredSessionUser(null);
  return await signOut(auth);
}

export default app;
