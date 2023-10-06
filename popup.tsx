import { createProvider } from "puro";
import { useContext, useState } from "react";

import { Provider, useView } from "~context/Provider";
import { SettingsScreen } from "~screens/Settings";
import { SigninScreen } from "~screens/Signin";

import "./style.css";

export default function IndexPopup() {
  return (
    <Provider>
      <IndexPopupContent />
    </Provider>
  );
}

function IndexPopupContent() {
  const { user, page, setPage } = useView();

  if (!user) return <SigninScreen />;

  return (
    <div className="flex items-center flex-col">
      {/* {!user && <SigninScreen />} */}
      {page === 0 && <h1>Analyze screen</h1>}
      {page === 1 && <h1>Cover letters screen</h1>}
      {page === 2 && <SettingsScreen />}

      <footer className="flex justify-evenly fixed bottom-[12px] left-0 w-full">
        <button
          className="btn btn-primary normal-case w-[100px]"
          onClick={() => setPage(0)}>
          Analyze
        </button>
        <button
          className="btn btn-primary normal-case w-[100px]"
          onClick={() => setPage(1)}>
          Cover letters
        </button>
        <button
          className="btn btn-primary normal-case w-[100px]"
          onClick={() => setPage(2)}>
          Settings
        </button>
      </footer>
    </div>
  );
}
