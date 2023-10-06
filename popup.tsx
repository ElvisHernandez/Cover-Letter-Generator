import { createProvider } from "puro";
import { useContext, useState } from "react";

import { Provider, useView } from "~context/Provider";
import { SettingsScreen } from "~screens/Settings";
import { SigninScreen } from "~screens/Signin";

import "./style.css";

import { AnalyzeScreen } from "~screens/Analyze";

export default function IndexPopup() {
  return (
    <Provider>
      <IndexPopupContent />
    </Provider>
  );
}

function IndexPopupContent() {
  const { user, page, setPage, isLoading } = useView();

  if (!user) return <SigninScreen />;

  return (
    <div className="flex items-center flex-col overflow-y-auto mb-[64px]">
      <div>
        {isLoading ? "Loading..." : ""}
        {!!user ? <div className="mb-[24px]">Welcome {user.email}!</div> : ""}
      </div>{" "}
      {page === 0 && <AnalyzeScreen />}
      {page === 1 && <h1>Cover letters screen</h1>}
      {page === 2 && <SettingsScreen />}
      <footer className="flex justify-evenly fixed bottom-[12px] left-0 w-full">
        <button
          className="btn btn-primary normal-case w-[120px]"
          onClick={() => setPage(0)}>
          Analyze
        </button>
        <button
          className="btn btn-primary normal-case w-[120px]"
          onClick={() => setPage(1)}>
          Cover letters
        </button>
        <button
          className="btn btn-primary normal-case w-[120px]"
          onClick={() => setPage(2)}>
          Settings
        </button>
      </footer>
    </div>
  );
}
