"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const newUser: User = {
            uid: fbUser.uid,
            email: fbUser.email!,
            displayName: fbUser.displayName ?? "Guest",
            photoURL: fbUser.photoURL,
            defaultAddressId: null,
          };
          await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
          setUser(newUser);
        } else {
          setUser(snap.data() as User);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    await signInWithPopup(auth, googleProvider);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function getIdToken(): Promise<string> {
    if (!firebaseUser) throw new Error("Not authenticated");
    return firebaseUser.getIdToken();
  }

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signIn, signOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
