import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithCredential,
  signInWithPopup
} from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { createProvider } from "puro";
import { useContext, useEffect, useRef, useState } from "react";

import { app, auth, db } from "~context";

setPersistence(auth, browserLocalPersistence);

type User = {
  email: string;
  uid: string;
  resumeLoading?: boolean;
  resumeFileName?: string;
  resumeError?: boolean;
  currentCoverLetter?: string;
  currentJobDescription?: string;
  coverLetterLoading?: boolean;
  coverLetterError?: boolean;
  encryptedOpenAiKey?: string;
  encryptedOpenAiKeyError?: boolean;
};

const emptyUser: User = {
  email: "",
  uid: ""
};

const useViewProvider = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User>(emptyUser);
  const [page, setPage] = useState(0);

  const onLogout = async () => {
    setIsLoading(true);
    if (user) {
      await auth.signOut();
      setUser(emptyUser);
    }
  };

  const doProdSignin = async () => {
    chrome.identity.getAuthToken({ interactive: true }, async function (token) {
      if (chrome.runtime.lastError || !token) {
        console.error(chrome.runtime.lastError?.message);
        setIsLoading(false);
        return;
      }
      if (token) {
        const credential = GoogleAuthProvider.credential(null, token);
        try {
          await signInWithCredential(auth, credential);
        } catch (e) {
          console.error("Could not log in. ", e);
          chrome.identity.clearAllCachedAuthTokens();
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const onLogin = async () => {
    setIsLoading(true);
    await doProdSignin();
  };

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      setIsLoading(false);
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        onValue(
          userRef,
          (snapshot) => {
            const user = snapshot.val();
            if (user) {
              setUser(user);
            }
          },
          { onlyOnce: false }
        );
      }
    });
  }, []);

  return {
    page,
    setPage,
    isLoading,
    user,
    onLogin,
    onLogout
  };
};

export const { BaseContext, Provider } = createProvider(useViewProvider);
export const useView = () => useContext(BaseContext);
