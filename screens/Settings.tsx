import * as Sentry from "@sentry/react";
import { ref as dbRef, update } from "firebase/database";
import { deleteObject, listAll, ref, uploadBytes } from "firebase/storage";
import React, { useState } from "react";

import { db, storage } from "~context";
import { useView } from "~context/Provider";

import api from "../api";

export const SettingsScreen = () => {
  const { user, isLoading, onLogout } = useView();
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openAiKeyLoading, setOpenAiKeyLoading] = useState(false);
  const [savedOpenaiKeyRes, setSavedOpenaiKeyRes] = useState({
    msg: "",
    success: false
  });
  const [uploadedResumeRes, setUploadedResumeRes] = useState({
    msg: "",
    success: false
  });

  const saveOpenAiApiKey = async () => {
    try {
      setOpenAiKeyLoading(true);
      const res = await api.post<{ statusCode: number }>({
        firebaseFunctionName: "saveOpenAiApiKey",
        payload: {
          openaiApiKey,
          userUid: user.uid
        }
      });

      if (res?.statusCode === 200) {
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

      setTimeout(
        () => setSavedOpenaiKeyRes({ msg: "", success: false }),
        10000
      );
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    } finally {
      setOpenAiKeyLoading(false);
    }
  };

  const uploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await update(dbRef(db, `users/${user.uid}`), {
        resumeLoading: true
      });
      const file = e.target.files?.[0];

      if (!file) {
        console.error("No file uploaded");
        return;
      }

      const resumeRef = ref(storage, `resumes/${user.uid}/${file.name}`);
      await deleteResumes();
      await uploadBytes(resumeRef, file);

      setUploadedResumeRes({
        msg: "Resume uploadeded successfully",
        success: true
      });
    } catch (e) {
      Sentry.captureException(e);

      console.error(e);
      setUploadedResumeRes({
        msg: "Resume failed to upload, please try again",
        success: false
      });
    } finally {
      e.target.value = "";
      setTimeout(
        () => setUploadedResumeRes({ msg: "", success: false }),
        10000
      );
    }
  };

  const deleteResumes = async () => {
    const res = await listAll(ref(storage, `resumes/${user.uid}`));

    for (const item of res.items) {
      await deleteObject(ref(storage, item.fullPath));
    }
  };

  return (
    <>
      <div className="form-control w-full max-w-xs mt-[60px]">
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
        {user.encryptedOpenAiKeyError && (
          <p className={`py-2 text-red-500`}>Failed to validate OpenAI key.</p>
        )}
        {!!savedOpenaiKeyRes.msg && (
          <p
            className={`py-2 ${
              savedOpenaiKeyRes.success ? "text-green-500" : "text-red-500"
            }`}>
            {savedOpenaiKeyRes.msg}
          </p>
        )}
        {!openAiKeyLoading && (
          <button
            disabled={!openaiApiKey}
            className="btn btn-primary"
            onClick={saveOpenAiApiKey}>
            Submit
          </button>
        )}{" "}
        {openAiKeyLoading && (
          <div className="flex justify-center mt-2">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        )}
      </div>

      <div className="form-control w-full max-w-xs my-[24px]">
        <label className="label">
          <span className="label-text">Upload your resume</span>
          {!!user.resumeLoading && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
          {!!user.resumeFileName && !user.resumeLoading && (
            <span className="text-green-500">({user.resumeFileName})</span>
          )}
        </label>
        <input
          type="file"
          accept=".docx,.pdf"
          disabled={!user.encryptedOpenAiKey || !!user.encryptedOpenAiKeyError}
          onChange={uploadResume}
          className="file-input file-input-bordered file-input-secondary w-full max-w-xs"
        />

        {user.resumeError && (
          <p className={`py-2 text-red-500`}>
            Resume failed to analyze resume, please try to re-upload
          </p>
        )}

        {!!uploadedResumeRes.msg && (
          <p
            className={`py-2 ${
              uploadedResumeRes.success ? "text-green-500" : "text-red-500"
            }`}>
            {uploadedResumeRes.msg}
          </p>
        )}
      </div>

      <button className="btn btn-accent" onClick={() => onLogout()}>
        Log out
      </button>
    </>
  );
};
