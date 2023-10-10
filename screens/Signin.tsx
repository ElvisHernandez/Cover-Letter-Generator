import googleSigninBackground from "data-base64:~assets/btn_google_light_normal_ios.svg";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";

import { auth } from "~context/index";
import { useView } from "~context/Provider";

const getAuthEmail = () => {
  const authEmail = process.env.PLASMO_PUBLIC_LOCAL_AUTH_EMAIL;
  if (!authEmail) {
    throw new Error("Auth email must be defined");
  }

  return authEmail;
};

export const SigninScreen = () => {
  const { onLogin, isLoading } = useView();

  const onSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, getAuthEmail(), "password");
    } catch (e) {
      console.error("Error on signup: ", e);
    }
  };

  const onSignin = async () => {
    try {
      await signInWithEmailAndPassword(auth, getAuthEmail(), "password");
    } catch (e) {
      console.error("Error signing in: ", e);
    }
  };

  if (process.env.NODE_ENV === "development") {
    return (
      <div className="w-full h-full flex justify-center items-center gap-4">
        <button className="btn" onClick={onSignup}>
          Sign up
        </button>
        <button className="btn" onClick={onSignin}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-full">
      {!isLoading && (
        <button className="btn btn-accent w-[260px]" onClick={() => onLogin()}>
          <img className="h-full" src={googleSigninBackground} />
          Sign in with Google
        </button>
      )}
      {isLoading && (
        <span className="loading loading-spinner loading-md"></span>
      )}
    </div>
  );
};
