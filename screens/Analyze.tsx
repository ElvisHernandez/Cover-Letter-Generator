import * as Sentry from "@sentry/react";
import { push, ref, update } from "firebase/database";
import { useMemo, useRef, useState } from "react";

import api from "~api";
import { db } from "~context";
import { useView } from "~context/Provider";

export const AnalyzeScreen = () => {
  const { user } = useView();
  const [localJobDescription, setLocalJobDescription] = useState("");
  const [style, setStyle] = useState("casual");
  const [emphasis, setEmphasis] = useState("problemSolving");
  const coverLetterRef = useRef<HTMLTextAreaElement>();
  const jobDescription = useMemo(() => {
    return localJobDescription || user?.currentJobDescription;
  }, [user, localJobDescription]);

  const createCoverLetter = async () => {
    try {
      await update(ref(db, `users/${user.uid}`), {
        coverLetterLoading: true,
        currentJobDescription: jobDescription
      });
      await api.post({
        firebaseFunctionName: "createCoverLetter",
        payload: {
          jobDescription,
          userUid: user.uid,
          style,
          emphasis
        }
      });
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    } finally {
      //   setIsLoading(false);
    }
  };

  const cancelAnalysis = async () => {
    try {
      update(ref(db, `users/${user.uid}`), {
        coverLetterLoading: false,
        coverLetterError: false,
        currentCoverLetter: ""
      });
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  };

  const saveCoverLetter = async () => {
    try {
      const newCoverLetterKey = push(ref(db, "coverLetters")).key;
      const updates = {
        [`users/${user.uid}/currentCoverLetter`]: "",
        [`users/${user.uid}/currentJobDescription`]: "",
        [`coverLetters/${newCoverLetterKey}`]: {
          userUid: user.uid,
          content: coverLetterRef.current?.value ?? user.currentCoverLetter,
          timestamp: Date.now()
        }
      };

      await update(ref(db), updates);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  };

  const isReadyToStartAnalyzing = () => {
    return (
      user.encryptedOpenAiKey &&
      !user.encryptedOpenAiKeyError &&
      user.resumeFileName
    );
  };

  if (!isReadyToStartAnalyzing()) {
    return (
      <div className="mt-[180px] text-base">
        <p>
          In order to start creating cover letters you must complete two steps
          first...
        </p>
        <ol className="list-decimal list-inside my-2">
          <li>
            Create an account and API key on the{" "}
            <a
              className="underline cursor-pointer"
              onClick={() =>
                window.open(
                  "https://platform.openai.com/account/api-keys",
                  "_blank"
                )
              }>
              OpenAI
            </a>{" "}
            website then insert the API key on the settings screen.
          </li>
          <li>
            Upload your resume and wait for the analysis to complete on the
            settings screen.
          </li>
        </ol>
        <p>Then you're done and ready to start creating cover letters!</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Style</span>
          </label>
          <select
            className="select select-bordered"
            onChange={(e) => setStyle(e.target.value)}
            value={style}>
            <option disabled selected>
              Pick one
            </option>
            <option value="casual">Casual</option>
            <option value="formal">formal</option>
            <option value="enthusiastic">Enthusiastic</option>
          </select>
        </div>
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Emphasis</span>
          </label>
          <select
            className="select select-bordered"
            onChange={(e) => setEmphasis(e.target.value)}
            value={emphasis}>
            <option disabled selected>
              Pick one
            </option>
            <option value="problemSolving">Problem-Solving</option>
            <option value="collaboration">Collaboration</option>
            <option value="leadership">Leadership</option>
          </select>
        </div>
      </div>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Job Description</span>
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setLocalJobDescription(e.target.value)}
          className="textarea textarea-bordered h-[300px] w-full"
          placeholder="Enter job description to analyze"></textarea>
      </div>

      {!!user.currentCoverLetter && (
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Cover Letter</span>
          </label>
          <textarea
            ref={(node: HTMLTextAreaElement) => {
              coverLetterRef.current = node;
            }}
            className="textarea textarea-bordered h-[300px] w-full whitespace-pre-line p-[24px]"
            placeholder="Cover Letter">
            {user.currentCoverLetter}
          </textarea>
        </div>
      )}

      {!!user.coverLetterError && (
        <p className="py-2 text-red-500">
          Apologies, seems there was an error analyzing your job description.
          Please try again.
        </p>
      )}

      {!user.coverLetterLoading && (
        <div className="flex gap-4">
          <button
            className="btn btn-accent mt-[12px] w-[100px]"
            onClick={createCoverLetter}
            disabled={!jobDescription || jobDescription.length < 100}>
            Analyze
          </button>
          <button
            className="btn btn-info mt-[12px] w-[100px]"
            onClick={saveCoverLetter}
            disabled={!user.currentCoverLetter}>
            Save
          </button>
        </div>
      )}

      {user.coverLetterLoading && (
        <>
          <span className="loading loading-spinner loading-lg mt-[12px]"></span>
          <button className="btn btn-error mt-[12px]" onClick={cancelAnalysis}>
            Cancel
          </button>
        </>
      )}
    </>
  );
};
