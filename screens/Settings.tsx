import { useState } from "react";

import { useView } from "~context/Provider";

import api from "../api";

export const SettingsScreen = () => {
  const { user, isLoading, onLogout } = useView();
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [savedOpenaiKeyRes, setSavedOpenaiKeyRes] = useState({
    msg: "",
    success: false
  });

  const saveOpenAiApiKey = async () => {
    const res = await api.post({
      firebaseFunctionName: "saveOpenAiApiKey",
      payload: {
        openaiApiKey,
        userUid: user.uid
      }
    });

    if (res.statusCode === 200) {
      setSavedOpenaiKeyRes({
        msg: "API key saved successfully!",
        success: true
      });
    } else {
      setSavedOpenaiKeyRes({
        msg: "API key failed to save, please make sure your key is correct and try again",
        success: false
      });
    }

    setTimeout(() => setSavedOpenaiKeyRes({ msg: "", success: false }), 10000);
    console.log("In the saveOpenaiApiKey function");
    console.log(res);
  };

  return (
    <>
      <div>
        {isLoading ? "Loading..." : ""}
        {!!user ? <div>Welcome {user.email}!</div> : ""}
      </div>

      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">What is your OpenAI API Key?</span>
        </label>
        <input
          type="password"
          defaultValue={user.encryptedOpenAiKey}
          placeholder="Type here"
          onChange={(e) => setOpenaiApiKey(e.target.value)}
          className="input input-bordered w-full max-w-xs"
        />

        {!!savedOpenaiKeyRes.msg && (
          <p
            className={`py-2 ${
              savedOpenaiKeyRes.success ? "text-green-500" : "text-red-500"
            }`}>
            {savedOpenaiKeyRes.msg}
          </p>
        )}
        <button
          disabled={!openaiApiKey}
          className="btn btn-primary"
          onClick={saveOpenAiApiKey}>
          Submit
        </button>

        <button className="btn btn-accent" onClick={() => onLogout()}>
          Log out
        </button>
      </div>
    </>
  );
};
