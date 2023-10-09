import { push, ref, update } from "firebase/database";
import { useMemo, useState } from "react";

import api from "~api";
import { db } from "~context";
import { useView } from "~context/Provider";

export const AnalyzeScreen = () => {
  const { user } = useView();
  const [localJobDescription, setLocalJobDescription] = useState("");

  const jobDescription = useMemo(() => {
    return localJobDescription || user?.currentJobDescription;
  }, [user, localJobDescription]);

  const createCoverLetter = async () => {
    // setIsLoading(true);

    await update(ref(db, `users/${user.uid}`), {
      coverLetterLoading: true,
      currentJobDescription: jobDescription
    });

    try {
      await api.post({
        firebaseFunctionName: "createCoverLetter",
        payload: {
          jobDescription,
          userUid: user.uid
        }
      });

      //   setCoverLetter(res?.data?.coverLetter ?? "");
    } catch (e) {
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
      console.error(e);
    }
  };

  const saveCoverLetter = async () => {
    const newCoverLetterKey = push(ref(db, "coverLetters")).key;
    try {
      const updates = {
        [`users/${user.uid}/currentCoverLetter`]: "",
        [`users/${user.uid}/currentJobDescription`]: "",
        [`coverLetters/${newCoverLetterKey}`]: {
          userUid: user.uid,
          content: user.currentCoverLetter,
          timestamp: Date.now()
        }
      };

      await update(ref(db), updates);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
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
