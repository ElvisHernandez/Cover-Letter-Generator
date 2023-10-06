import { deleteObject, listAll, ref, uploadBytes } from "firebase/storage";
import { useState } from "react";

import { storage } from "~context";
import { useView } from "~context/Provider";

import api from "../api";

export const SettingsScreen = () => {
  const { user, isLoading, onLogout } = useView();
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [savedOpenaiKeyRes, setSavedOpenaiKeyRes] = useState({
    msg: "",
    success: false
  });
  const [uploadedResumeRes, setUploadedResumeRes] = useState({
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

  const uploadResume = async (e) => {
    try {
      console.log("In the file onChange");
      console.log(e);
      const [file] = e.target.files;

      const resumeRef = ref(storage, `resumes/${user.uid}/${file.name}`);
      await deleteResumes();
      const res = await uploadBytes(resumeRef, file);

      console.log("Uploaded resume!!!");
      console.log(res);
      setUploadedResumeRes({
        msg: "Resume uploadeded successfully",
        success: true
      });
    } catch (e) {
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
      </div>

      <div className="form-control w-full max-w-xs my-[24px]">
        <label className="label">
          <span className="label-text">Upload your resume</span>

          {!!user.resumeFileName && (
            <span className="text-green-500">({user.resumeFileName})</span>
          )}
        </label>
        <input
          type="file"
          onChange={uploadResume}
          className="file-input file-input-bordered file-input-secondary w-full max-w-xs"
        />

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
