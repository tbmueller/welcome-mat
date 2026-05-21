"use client";

import { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Process any pending redirect result (fires after signInWithRedirect returns)
    getRedirectResult(auth).catch(() => {});

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
      setSigningIn(false);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-blocked") {
        // Browser blocked the popup — fall back to redirect (navigates away, result handled on return)
        await signInWithRedirect(auth, googleProvider);
        return; // page will reload; signingIn stays true intentionally
      }
      // User closed the popup or cancelled — not an error
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setSigningIn(false);
        throw err;
      }
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const getIdToken = useCallback(async (): Promise<string> => {
    if (!firebaseUser) throw new Error("Not authenticated");
    return firebaseUser.getIdToken();
  }, [firebaseUser]);

  const value = useMemo(
    () => ({ user, firebaseUser, loading, signingIn, signIn, signOut, getIdToken }),
    [user, firebaseUser, loading, signingIn, signIn, signOut, getIdToken]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
