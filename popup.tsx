import { createProvider } from "puro";
import { useContext, useState } from "react";

import { Provider, useView } from "~context/Provider";
import { SettingsScreen } from "~screens/Settings";
import { SigninScreen } from "~screens/Signin";

import "./style.css";

import { AnalyzeScreen } from "~screens/Analyze";
import { CoverLettersScreen } from "~screens/CoverLetters";

export default function IndexPopup() {
  return (
    <Provider>
      <IndexPopupContent />
    </Provider>
  );
}

function IndexPopupContent() {
  const { user, page, setPage, isLoading } = useView();

  if (!user.uid) return <SigninScreen />;

  return (
    <div className={`${page === 0 || page === 1 ? "pb-[86px]" : ""}`}>
      <div className="w-full flex items-center flex-col">
        <div>
          {isLoading ? "Loading..." : ""}
          {!!user ? <div className="mb-[24px]">Welcome {user.email}!</div> : ""}
        </div>{" "}
        {page === 0 && <AnalyzeScreen />}
        {page === 1 && <CoverLettersScreen />}
        {page === 2 && <SettingsScreen />}
      </div>

      <footer className="flex justify-evenly bg-base-100 fixed bottom-[12px] left-0 w-full pt-[12px]">
        <button
          className={`btn btn-neutral normal-case w-[120px] ${
            page === 0 ? "btn-active btn-outline" : ""
          }`}
          onClick={() => setPage(0)}>
          Analyze
        </button>
        <button
          className={`btn btn-neutral normal-case w-[120px] ${
            page === 1 ? "btn-active btn-outline" : ""
          }`}
          onClick={() => setPage(1)}>
          Cover letters
        </button>
        <button
          className={`btn btn-neutral normal-case w-[120px] ${
            page === 2 ? "btn-active btn-outline" : ""
          }`}
          onClick={() => setPage(2)}>
          Settings
        </button>
      </footer>
    </div>
  );
}
