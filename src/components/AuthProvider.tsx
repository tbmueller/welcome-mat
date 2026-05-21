"use client";

import { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from "react";
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
        try {
          const ref = doc(db, "users", fbUser.uid);
          const snap = await getDoc(ref);
          const stored = snap.data();
          if (!snap.exists() || !stored?.uid) {
            // Doc missing or incomplete (e.g. created by a server merge with only defaultAddressId)
            const newUser: User = {
              uid: fbUser.uid,
              email: fbUser.email!,
              displayName: fbUser.displayName ?? "Guest",
              photoURL: fbUser.photoURL,
              defaultAddressId: stored?.defaultAddressId ?? null,
            };
            await setDoc(ref, { ...newUser, createdAt: serverTimestamp() }, { merge: true });
            setUser(newUser);
          } else {
            setUser(stored as User);
          }
        } catch {
          // Firestore unavailable — build user from Auth data
          setUser({
            uid: fbUser.uid,
            email: fbUser.email!,
            displayName: fbUser.displayName ?? "Guest",
            photoURL: fbUser.photoURL,
            defaultAddressId: null,
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const getIdToken = useCallback(async (): Promise<string> => {
    if (!firebaseUser) throw new Error("Not authenticated");
    return firebaseUser.getIdToken();
  }, [firebaseUser]);

  const value = useMemo(
    () => ({ user, firebaseUser, loading, signIn, signOut, getIdToken }),
    [user, firebaseUser, loading, signIn, signOut, getIdToken]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
