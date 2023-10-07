import { useState } from "react";

import api from "~api";
import { useView } from "~context/Provider";

export const AnalyzeScreen = () => {
  const { user } = useView();
  const [jobDescription, setJobDescription] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createCoverLetter = async () => {
    setIsLoading(true);

    try {
      const res = await api.post<{ data: { coverLetter: string } }>({
        firebaseFunctionName: "createCoverLetter",
        payload: {
          jobDescription,
          userUid: user.uid
        }
      });

      setCoverLetter(res?.data?.coverLetter ?? "");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">Job Description</span>
        </label>
        <textarea
          onChange={(e) => setJobDescription(e.target.value)}
          className="textarea textarea-bordered h-[300px] w-full"
          placeholder="Bio"></textarea>
      </div>

      {!!coverLetter && (
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Cover Letter</span>
          </label>
          <textarea
            //   onChange={(e) => setJobDescription(e.target.value)}
            className="textarea textarea-bordered h-[300px] w-full whitespace-pre-line p-[24px]"
            placeholder="Bio">
            {coverLetter}
          </textarea>
        </div>
      )}

      {!isLoading && (
        <div className="flex gap-4">
          <button
            className="btn btn-accent mt-[12px] w-[100px]"
            onClick={createCoverLetter}
            disabled={!jobDescription || jobDescription.length < 100}>
            Analyze
          </button>
          <button
            className="btn btn-info mt-[12px] w-[100px]"
            onClick={createCoverLetter}
            disabled={!coverLetter}>
            Save
          </button>
        </div>
      )}

      {isLoading && (
        <span className="loading loading-spinner loading-lg mt-[12px]"></span>
      )}
    </>
  );
};
